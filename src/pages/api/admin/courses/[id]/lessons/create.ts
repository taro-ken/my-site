import type { APIRoute } from "astro";
import { adminDb } from "../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../lib/admin";

/** "https://youtu.be/xxx"や"https://www.youtube.com/watch?v=xxx"、素のIDのいずれでも受け付ける。 */
function extractYoutubeVideoId(input: string): string | null {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        if (url.hostname.includes("youtu.be")) {
            return url.pathname.replace("/", "") || null;
        }
        const v = url.searchParams.get("v");
        if (v) return v;
        const embedMatch = url.pathname.match(/\/embed\/([\w-]+)/);
        if (embedMatch) return embedMatch[1];
        return null;
    } catch {
        // URLではない場合は、素の動画IDとして扱う。
        return /^[\w-]{6,}$/.test(trimmed) ? trimmed : null;
    }
}

/**
 * 管理者専用: 講座にレッスン(YouTube動画参照)を追加する。
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

    let body: { title?: string; description?: string; youtubeUrl?: string };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { title, description, youtubeUrl } = body;
    if (!title || !youtubeUrl) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const youtubeVideoId = extractYoutubeVideoId(youtubeUrl);
    if (!youtubeVideoId) {
        return new Response(JSON.stringify({ error: "YouTubeのURLまたは動画IDを認識できませんでした" }), { status: 400 });
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    const lessonsRef = courseRef.collection("lessons");
    const countSnapshot = await lessonsRef.count().get();

    await adminDb.runTransaction(async (tx) => {
        const lessonRef = lessonsRef.doc();
        tx.set(lessonRef, {
            title,
            description: description ?? "",
            youtubeVideoId,
            position: countSnapshot.data().count,
        });
        tx.update(courseRef, { lessonCount: countSnapshot.data().count + 1 });
    });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
