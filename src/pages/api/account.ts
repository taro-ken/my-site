import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { stripe } from "../../lib/stripe";
import { adminAuth, adminDb } from "../../lib/firebase/server";

/**
 * ネイティブアプリ(Essence)向けのアカウント削除。Firebase IDトークンで認証する。
 * Stripe顧客(=サブスクリプションも即時終了・カード情報も削除)→ 掲示板の投稿/返信/通報 →
 * Firestoreのユーザーデータ → Firebase Authのユーザーの順に消す。
 * 途中で失敗してもクライアントが再実行できるよう、Authのユーザー削除は必ず最後に行い、各手順は冪等にしている。
 */

async function deleteBoardContent(uid: string) {
    const posts = adminDb.collection("boardPosts");

    // 自分の投稿(他のメンバーがつけた返信ごと)
    const ownPosts = await posts.where("authorUid", "==", uid).get();
    await Promise.all(ownPosts.docs.map((doc) => adminDb.recursiveDelete(doc.ref)));

    // 他のメンバーの投稿につけた自分の返信。コレクショングループ用のインデックスを要求しないよう、投稿ごとに検索する。
    const remainingPosts = await posts.select().get();
    for (let i = 0; i < remainingPosts.docs.length; i += 20) {
        await Promise.all(
            remainingPosts.docs.slice(i, i + 20).map(async (postDoc) => {
                const mine = await postDoc.ref.collection("replies").where("authorUid", "==", uid).get();
                if (mine.empty) return;
                await Promise.all(mine.docs.map((reply) => reply.ref.delete()));
                await postDoc.ref.update({ replyCount: FieldValue.increment(-mine.size) });
            })
        );
    }

    for (const field of ["reporterUid", "reportedUid"]) {
        const reports = await adminDb.collection("boardReports").where(field, "==", uid).get();
        await Promise.all(reports.docs.map((doc) => doc.ref.delete()));
    }
}

export const DELETE: APIRoute = async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];

    if (!idToken) {
        return new Response(JSON.stringify({ error: "No token provided" }), { status: 401 });
    }

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        uid = decoded.uid;
    } catch {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    const userRef = adminDb.collection("users").doc(uid);

    try {
        const customerId = (await userRef.get()).data()?.stripe_customer_id as string | undefined;
        if (customerId) {
            try {
                await stripe.customers.del(customerId);
            } catch (err: any) {
                if (err?.code !== "resource_missing") throw err;
            }
        }

        await deleteBoardContent(uid);
        await adminDb.recursiveDelete(userRef);

        try {
            await adminAuth.deleteUser(uid);
        } catch (err: any) {
            if (err?.code !== "auth/user-not-found") throw err;
        }
    } catch (err: any) {
        console.error("[account delete] failed:", err);
        return new Response(JSON.stringify({ error: "アカウントの削除に失敗しました。時間をおいて再度お試しください。" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
