import type { APIRoute } from "astro";
import { adminDb } from "../../../../lib/firebase/server";
import { requireAdmin } from "../../../../lib/admin";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, PODCAST_AUDIO_CONTENT_TYPE, podcastAudioKey } from "../../../../lib/r2";

/**
 * 管理者専用: Podcastエピソードのメタデータ(Firestore)を作成し、
 * 音声本体をR2へ直接PUTするための署名付きアップロードURLを発行する。
 * 音声ファイル自体はブラウザからR2へ直接アップロードするため、
 * Vercel Functionのリクエストボディサイズ制限を受けない。
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    let body: { title?: string; subtitle?: string; publishedAt?: string; durationSeconds?: number };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { title, subtitle, publishedAt, durationSeconds } = body;
    if (!title || !publishedAt || !durationSeconds) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const docRef = adminDb.collection("podcastEpisodes").doc();
    await docRef.set({
        title,
        subtitle: subtitle ?? "",
        publishedAt: new Date(publishedAt),
        durationSeconds: Math.round(durationSeconds),
    });

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: podcastAudioKey(docRef.id),
        ContentType: PODCAST_AUDIO_CONTENT_TYPE,
    });
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    return new Response(JSON.stringify({ id: docRef.id, uploadUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
