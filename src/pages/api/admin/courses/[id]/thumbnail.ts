import type { APIRoute } from "astro";
import { adminDb } from "../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../lib/admin";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
    r2Client,
    R2_BUCKET_NAME,
    COURSE_THUMBNAIL_CONTENT_TYPES,
    COURSE_THUMBNAIL_MAX_BYTES,
    courseThumbnailKey,
} from "../../../../../lib/r2";

/**
 * 管理者専用: 講座のサムネイル画像をR2に保存し、Firestoreの thumbnailUrl を更新する。
 * R2は非公開のため、thumbnailUrl には公開用の /api/courses/{id}/thumbnail を入れる。
 */
export const POST: APIRoute = async ({ params, request, cookies, url }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const courseId = params.id;
    if (!courseId) {
        return new Response(JSON.stringify({ error: "Missing course id" }), { status: 400 });
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    if (!(await courseRef.get()).exists) {
        return new Response(JSON.stringify({ error: "講座が見つかりません" }), { status: 404 });
    }

    let file: File | null = null;
    try {
        const formData = await request.formData();
        file = formData.get("image") as File | null;
    } catch {
        return new Response(JSON.stringify({ error: "Invalid form data" }), { status: 400 });
    }

    if (!file || file.size === 0) {
        return new Response(JSON.stringify({ error: "画像を選択してください" }), { status: 400 });
    }
    if (!COURSE_THUMBNAIL_CONTENT_TYPES.includes(file.type)) {
        return new Response(JSON.stringify({ error: "JPEG・PNG・WebP の画像を選択してください" }), { status: 400 });
    }
    if (file.size > COURSE_THUMBNAIL_MAX_BYTES) {
        return new Response(JSON.stringify({ error: "画像は 4MB 以下にしてください" }), { status: 400 });
    }

    await r2Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: courseThumbnailKey(courseId),
            ContentType: file.type,
            Body: new Uint8Array(await file.arrayBuffer()),
        })
    );

    // 差し替え時にアプリ側のキャッシュが使われないよう、URLに更新時刻を付ける
    const thumbnailUrl = `${url.origin}/api/courses/${courseId}/thumbnail?v=${Date.now()}`;
    await courseRef.update({ thumbnailUrl });

    return new Response(JSON.stringify({ thumbnailUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
