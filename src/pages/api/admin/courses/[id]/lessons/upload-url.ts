import type { APIRoute } from "astro";
import { adminDb } from "../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../lib/admin";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, COURSE_VIDEO_CONTENT_TYPE, courseVideoKey } from "../../../../../../lib/r2";

/**
 * 管理者専用: レッスン動画をR2へ直接PUTするための署名付きアップロードURLを発行する。
 * この時点ではFirestoreにレッスンのメタデータをまだ作成しない
 * (アップロード完了前にレッスンが会員に見えてしまうのを防ぐため。
 * メタデータの作成はアップロード成功後にlessons/create.tsで行う)。
 */
export const POST: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const courseId = params.id;
    if (!courseId) {
        return new Response(JSON.stringify({ error: "Missing course id" }), { status: 400 });
    }

    const lessonId = adminDb.collection("courses").doc(courseId).collection("lessons").doc().id;

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: courseVideoKey(courseId, lessonId),
        ContentType: COURSE_VIDEO_CONTENT_TYPE,
    });
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    return new Response(JSON.stringify({ lessonId, uploadUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
