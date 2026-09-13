import type { APIRoute } from "astro";
import { adminDb } from "../../../../lib/firebase/server";
import { requireAdmin } from "../../../../lib/admin";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, podcastAudioKey } from "../../../../lib/r2";

/**
 * 管理者専用: Podcastエピソードを削除する。
 * Firestoreのメタデータと、R2上の音声ファイルの両方を消す(片方だけ残ると
 * 「一覧には出るが再生できない」「消したのに一覧に残る」といった不整合が起きるため)。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const episodeId = params.id;
    if (!episodeId) {
        return new Response(JSON.stringify({ error: "Missing episode id" }), { status: 400 });
    }

    try {
        await r2Client.send(
            new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: podcastAudioKey(episodeId) })
        );
    } catch (err) {
        console.error("[podcast delete] R2 delete failed:", err);
    }

    await adminDb.collection("podcastEpisodes").doc(episodeId).delete();

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};

/**
 * 管理者専用: タイトル・概要など、音声を含まないメタデータのみを編集する。
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const episodeId = params.id;
    if (!episodeId) {
        return new Response(JSON.stringify({ error: "Missing episode id" }), { status: 400 });
    }

    let body: { title?: string; subtitle?: string };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { title, subtitle } = body;
    if (!title) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    await adminDb.collection("podcastEpisodes").doc(episodeId).update({
        title,
        subtitle: subtitle ?? "",
    });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
