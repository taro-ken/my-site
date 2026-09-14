import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../../lib/admin";

/**
 * 管理者専用: 掲示板の返信を1件削除する。投稿側のreplyCountも合わせて減らす。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { id: postId, replyId } = params;
    if (!postId || !replyId) {
        return new Response(JSON.stringify({ error: "Missing post id or reply id" }), { status: 400 });
    }

    const postRef = adminDb.collection("boardPosts").doc(postId);
    await postRef.collection("replies").doc(replyId).delete();
    await postRef.update({ replyCount: FieldValue.increment(-1) });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
