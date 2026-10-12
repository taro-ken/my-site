import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../lib/firebase/server";
import { requireMemberUid } from "../../../../lib/courses";

/** Web の講座ページから、レッスンの完了/未完了を切り替える。アプリと同じ courseProgress に書き込む。 */
export const POST: APIRoute = async ({ cookies, params, request }) => {
    const uid = await requireMemberUid(cookies);
    if (!uid) {
        return new Response(JSON.stringify({ error: "Subscription required" }), { status: 403 });
    }

    const { courseId } = params;
    const body = await request.json().catch(() => null);
    const lessonId = typeof body?.lessonId === "string" ? body.lessonId : null;
    const completed = body?.completed === true;
    if (!courseId || !lessonId) {
        return new Response(JSON.stringify({ error: "Missing course or lesson id" }), { status: 400 });
    }

    const lessonDoc = await adminDb.collection("courses").doc(courseId).collection("lessons").doc(lessonId).get();
    if (!lessonDoc.exists) {
        return new Response(JSON.stringify({ error: "Lesson not found" }), { status: 404 });
    }

    await adminDb
        .collection("users").doc(uid)
        .collection("courseProgress").doc(courseId)
        .set({ completedLessonIds: completed ? FieldValue.arrayUnion(lessonId) : FieldValue.arrayRemove(lessonId) }, { merge: true });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
