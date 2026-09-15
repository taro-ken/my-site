import type { APIRoute } from "astro";
import { adminDb } from "../../../../lib/firebase/server";
import { requireAdmin } from "../../../../lib/admin";

/**
 * 管理者専用: 講座を、その下のレッスンごと削除する。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const courseId = params.id;
    if (!courseId) {
        return new Response(JSON.stringify({ error: "Missing course id" }), { status: 400 });
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    await adminDb.recursiveDelete(courseRef);

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
