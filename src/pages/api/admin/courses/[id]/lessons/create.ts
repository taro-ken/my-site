import type { APIRoute } from "astro";
import { adminDb } from "../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../lib/admin";

/**
 * 管理者専用: レッスンのメタデータ(Firestore)を作成する。
 * 動画本体は事前にupload-url.tsで発行した署名付きURLでR2へアップロード済みであることが前提
 * (アップロード成功後にのみ呼ばれる。順序を逆にすると、動画のないレッスンが
 * 一瞬会員に見えてしまう)。
 */
export const POST: APIRoute = async ({ params, request, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const courseId = params.id;
    if (!courseId) {
        return new Response(JSON.stringify({ error: "Missing course id" }), { status: 400 });
    }

    let body: { lessonId?: string; title?: string; description?: string; chapterTitle?: string };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { lessonId, title, description, chapterTitle } = body;
    if (!lessonId || !title) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    const lessonsRef = courseRef.collection("lessons");
    const lessonRef = lessonsRef.doc(lessonId);
    const countSnapshot = await lessonsRef.count().get();

    await adminDb.runTransaction(async (tx) => {
        tx.set(lessonRef, {
            title,
            description: description ?? "",
            position: countSnapshot.data().count,
            chapterTitle: chapterTitle || null,
        });
        tx.update(courseRef, { lessonCount: countSnapshot.data().count + 1 });
    });

    return new Response(JSON.stringify({ ok: true, id: lessonRef.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
