import type { APIRoute } from "astro";
import { adminDb } from "../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../lib/admin";

/**
 * 管理者専用: 通報を閉じる(対象の投稿/返信を削除した後、または問題なしと判断した場合)。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const reportId = params.id;
    if (!reportId) {
        return new Response(JSON.stringify({ error: "Missing report id" }), { status: 400 });
    }

    await adminDb.collection("boardReports").doc(reportId).delete();

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
