import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../lib/admin";

/**
 * 管理者専用: レッスンを1件削除する。講座側のlessonCountも合わせて減らす。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { id: courseId, lessonId } = params;
    if (!courseId || !lessonId) {
        return new Response(JSON.stringify({ error: "Missing course id or lesson id" }), { status: 400 });
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    await courseRef.collection("lessons").doc(lessonId).delete();
    await courseRef.update({ lessonCount: FieldValue.increment(-1) });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
