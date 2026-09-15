import type { APIRoute } from "astro";
import { adminDb } from "../../../../lib/firebase/server";
import { requireAdmin } from "../../../../lib/admin";

/**
 * 管理者専用: 講座(コース)を作成する。動画本体は持たず、レッスン側でYouTube動画IDを参照する。
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    let body: { title?: string; description?: string; thumbnailUrl?: string };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { title, description, thumbnailUrl } = body;
    if (!title) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const countSnapshot = await adminDb.collection("courses").count().get();
    const docRef = adminDb.collection("courses").doc();
    await docRef.set({
        title,
        description: description ?? "",
        thumbnailUrl: thumbnailUrl || null,
        lessonCount: 0,
        position: countSnapshot.data().count,
    });

    return new Response(JSON.stringify({ id: docRef.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
