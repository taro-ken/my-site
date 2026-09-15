import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "../../../../../../lib/firebase/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, courseVideoKey } from "../../../../../../lib/r2";

/**
 * ネイティブアプリ(Essence)向け講座レッスン動画URL発行エンドポイント。
 * 動画本体はCloudflare R2に置き(転送量無料)、会員(stripe_status=active)にのみ
 * 期限付きの署名URLを発行する。他のapp向けエンドポイントと同様、Firebase IDトークンで認証する。
 * レッスン動画は長時間になりうるため、Podcast音声より長めの有効期限を設定する。
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

    const { courseId, lessonId } = params;
    if (!courseId || !lessonId) {
        return new Response(JSON.stringify({ error: "Missing course or lesson id" }), { status: 400 });
    }

    // 会員チェックとレッスン存在チェックは互いに依存しないため並列に投げてレイテンシを縮める。
    const [userDoc, lessonDoc] = await Promise.all([
        adminDb.collection("users").doc(uid).get(),
        adminDb.collection("courses").doc(courseId).collection("lessons").doc(lessonId).get(),
    ]);

    if (userDoc.data()?.stripe_status !== "active") {
        return new Response(JSON.stringify({ error: "Subscription required" }), { status: 403 });
    }
    if (!lessonDoc.exists) {
        return new Response(JSON.stringify({ error: "Lesson not found" }), { status: 404 });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: courseVideoKey(courseId, lessonId),
        });
        const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

        return new Response(JSON.stringify({ url }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[course video-url] R2 Error:", err);
        return new Response(JSON.stringify({ error: err.message || "Failed to sign video URL" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
