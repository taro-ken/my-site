import type { APIRoute } from "astro";
import { adminDb } from "../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../lib/admin";

/**
 * 管理者専用: 掲示板の投稿を、その下の返信ごと削除する。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const postId = params.id;
    if (!postId) {
        return new Response(JSON.stringify({ error: "Missing post id" }), { status: 400 });
    }

    const postRef = adminDb.collection("boardPosts").doc(postId);
    await adminDb.recursiveDelete(postRef);

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
