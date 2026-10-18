import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/admin";
import { adminDb } from "../../../lib/firebase/server";
import { isResendConfigured, notifyActiveMembers, type MemberNotifyKind } from "../../../lib/resend";

/**
 * 管理者専用: Essence会員へ Course / Podcast 更新メールを送る。
 * 自動送信はせず、管理画面の明示操作でのみ呼び出す。
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return json({ error: "Forbidden" }, 403);
    }
    if (!isResendConfigured()) {
        return json({ error: "RESEND_API_KEY が未設定です" }, 503);
    }

    let body: { kind?: MemberNotifyKind; id?: string };
    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON" }, 400);
    }

    const { kind, id } = body;
    if ((kind !== "podcast" && kind !== "course") || !id) {
        return json({ error: "kind と id が必要です" }, 400);
    }

    try {
        if (kind === "podcast") {
            const doc = await adminDb.collection("podcastEpisodes").doc(id).get();
            if (!doc.exists) return json({ error: "Episode not found" }, 404);
            const data = doc.data()!;
            const publishedAt = data.publishedAt?.toDate?.() as Date | undefined;
            if (publishedAt && publishedAt > new Date()) {
                return json({ error: "予約中のエピソードには送れません。公開後に送ってください。" }, 400);
            }

            const result = await notifyActiveMembers({
                kind: "podcast",
                title: (data.title as string) || "新しいエピソード",
                summary: (data.subtitle as string) || undefined,
                url: "https://taroessence.com/app/podcast",
            });
            return json({ ok: true, ...result }, 200);
        }

        const doc = await adminDb.collection("courses").doc(id).get();
        if (!doc.exists) return json({ error: "Course not found" }, 404);
        const data = doc.data()!;

        const result = await notifyActiveMembers({
            kind: "course",
            title: (data.title as string) || "新しい講座",
            summary: (data.description as string) || undefined,
            url: `https://taroessence.com/courses/${id}`,
        });
        return json({ ok: true, ...result }, 200);
    } catch (err: any) {
        console.error("[notify-members]", err);
        return json({ error: err?.message || "送信に失敗しました" }, 500);
    }
};

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
