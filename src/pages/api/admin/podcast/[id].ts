import type { APIRoute } from "astro";
import { adminDb } from "../../../../lib/firebase/server";
import { requireAdmin } from "../../../../lib/admin";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, PODCAST_AUDIO_CONTENT_TYPE, podcastAudioKey } from "../../../../lib/r2";

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
 * 管理者専用: タイトル・概要・公開日時・再生時間を編集する。
 * 音声の差し替えは、replaceAudio: true を送ると同じキーへPUTするための署名付きURLを返す
 * (ファイル本体はブラウザからR2へ直接アップロードする)。
 * アップロード成功後に durationSeconds だけを送り直して、再生時間を更新する。
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

    let body: { title?: string; subtitle?: string; publishedAt?: string; durationSeconds?: number; replaceAudio?: boolean };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { title, subtitle, publishedAt, durationSeconds, replaceAudio } = body;

    // 音声差し替え後の再生時間だけを更新する呼び出し
    if (durationSeconds && !title) {
        await adminDb.collection("podcastEpisodes").doc(episodeId).update({
            durationSeconds: Math.round(durationSeconds),
        });
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!title) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const update: Record<string, unknown> = {
        title,
        subtitle: subtitle ?? "",
    };
    if (publishedAt) {
        const parsedPublishedAt = new Date(publishedAt);
        if (!Number.isNaN(parsedPublishedAt.getTime())) {
            update.publishedAt = parsedPublishedAt;
        }
    }

    await adminDb.collection("podcastEpisodes").doc(episodeId).update(update);

    let uploadUrl: string | undefined;
    if (replaceAudio) {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: podcastAudioKey(episodeId),
            ContentType: PODCAST_AUDIO_CONTENT_TYPE,
        });
        uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });
    }

    return new Response(JSON.stringify({ ok: true, uploadUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
