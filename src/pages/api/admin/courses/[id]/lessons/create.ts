import type { APIRoute } from "astro";
import { adminDb } from "../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../lib/admin";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, COURSE_VIDEO_CONTENT_TYPE, courseVideoKey } from "../../../../../../lib/r2";

/**
 * 管理者専用: 講座にレッスンのメタデータ(Firestore)を作成し、
 * 動画本体をR2へ直接PUTするための署名付きアップロードURLを発行する。
 * 動画ファイル自体はブラウザからR2へ直接アップロードするため、
 * Vercel Functionのリクエストボディサイズ制限を受けない。
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

    let body: { title?: string; description?: string; chapterTitle?: string };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { title, description, chapterTitle } = body;
    if (!title) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    const lessonsRef = courseRef.collection("lessons");
    const countSnapshot = await lessonsRef.count().get();
    const lessonRef = lessonsRef.doc();

    await adminDb.runTransaction(async (tx) => {
        tx.set(lessonRef, {
            title,
            description: description ?? "",
            position: countSnapshot.data().count,
            chapterTitle: chapterTitle || null,
        });
        tx.update(courseRef, { lessonCount: countSnapshot.data().count + 1 });
    });

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: courseVideoKey(courseId, lessonRef.id),
        ContentType: COURSE_VIDEO_CONTENT_TYPE,
    });
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    return new Response(JSON.stringify({ id: lessonRef.id, uploadUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
