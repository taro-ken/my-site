import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "../../../../../lib/firebase/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, podcastAudioKey } from "../../../../../lib/r2";

/**
 * ネイティブアプリ(Essence)向けPodcast音声URL発行エンドポイント。
 * 音声本体はCloudflare R2に置き(転送量無料)、会員(stripe_status=active)にのみ
 * 期限付きの署名URLを発行する。他のapp向けエンドポイントと同様、Firebase IDトークンで認証する。
 */

export const GET: APIRoute = async ({ request, params }) => {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];

    if (!idToken) {
        return new Response(JSON.stringify({ error: "No token provided" }), { status: 401 });
    }

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        uid = decoded.uid;
    } catch {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    const episodeId = params.id;
    if (!episodeId) {
        return new Response(JSON.stringify({ error: "Missing episode id" }), { status: 400 });
    }

    // 会員チェックとエピソード存在チェックは互いに依存しないため並列に投げてレイテンシを縮める。
    const [userDoc, episodeDoc] = await Promise.all([
        adminDb.collection("users").doc(uid).get(),
        adminDb.collection("podcastEpisodes").doc(episodeId).get(),
    ]);

    if (userDoc.data()?.stripe_status !== "active") {
        return new Response(JSON.stringify({ error: "Subscription required" }), { status: 403 });
    }
    if (!episodeDoc.exists) {
        return new Response(JSON.stringify({ error: "Episode not found" }), { status: 404 });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: podcastAudioKey(episodeId),
        });
        const url = await getSignedUrl(r2Client, command, { expiresIn: 600 });

        return new Response(JSON.stringify({ url }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[podcast audio-url] R2 Error:", err);
        return new Response(JSON.stringify({ error: err.message || "Failed to sign audio URL" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
