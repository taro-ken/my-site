import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../lib/admin";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, COURSE_VIDEO_CONTENT_TYPE, courseVideoKey } from "../../../../../../lib/r2";

/**
 * 管理者専用: レッスンの章タイトル・タイトル・説明を更新する。
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { id: courseId, lessonId } = params;
    if (!courseId || !lessonId) {
        return new Response(JSON.stringify({ error: "Missing course id or lesson id" }), { status: 400 });
    }

    let body: { title?: string; description?: string; chapterTitle?: string };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const title = body.title?.trim();
    if (!title) {
        return new Response(JSON.stringify({ error: "レッスンタイトルを入力してください" }), { status: 400 });
    }

    const lessonRef = adminDb.collection("courses").doc(courseId).collection("lessons").doc(lessonId);
    if (!(await lessonRef.get()).exists) {
        return new Response(JSON.stringify({ error: "レッスンが見つかりません" }), { status: 404 });
    }
    await lessonRef.update({
        title,
        description: body.description ?? "",
        chapterTitle: body.chapterTitle?.trim() || null,
    });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};

/**
 * 管理者専用: 既存レッスンの動画を差し替えるための署名付きアップロードURLを発行する。
 * 同じキーに上書きするため、Firestore側の更新は不要。
 */
export const POST: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { id: courseId, lessonId } = params;
    if (!courseId || !lessonId) {
        return new Response(JSON.stringify({ error: "Missing course id or lesson id" }), { status: 400 });
    }

    const lessonRef = adminDb.collection("courses").doc(courseId).collection("lessons").doc(lessonId);
    if (!(await lessonRef.get()).exists) {
        return new Response(JSON.stringify({ error: "レッスンが見つかりません" }), { status: 404 });
    }

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: courseVideoKey(courseId, lessonId),
        ContentType: COURSE_VIDEO_CONTENT_TYPE,
    });
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    return new Response(JSON.stringify({ uploadUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};

/**
 * 管理者専用: レッスンを1件削除する。講座側のlessonCountも合わせて減らす。
 * Firestoreのメタデータと、R2上の動画ファイルの両方を消す。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const { id: courseId, lessonId } = params;
    if (!courseId || !lessonId) {
        return new Response(JSON.stringify({ error: "Missing course id or lesson id" }), { status: 400 });
    }

    try {
        await r2Client.send(
            new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: courseVideoKey(courseId, lessonId) })
        );
    } catch (err) {
        console.error("[lesson delete] R2 delete failed:", err);
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    await courseRef.collection("lessons").doc(lessonId).delete();
    await courseRef.update({ lessonCount: FieldValue.increment(-1) });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
