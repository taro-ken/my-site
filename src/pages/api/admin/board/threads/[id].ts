import type { APIRoute } from "astro";
import { adminDb } from "../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../lib/admin";

/**
 * 管理者専用: 掲示板のトピックを、その下の返信ごと削除する。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const threadId = params.id;
    if (!threadId) {
        return new Response(JSON.stringify({ error: "Missing thread id" }), { status: 400 });
    }

    const threadRef = adminDb.collection("boardThreads").doc(threadId);
    await adminDb.recursiveDelete(threadRef);

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
