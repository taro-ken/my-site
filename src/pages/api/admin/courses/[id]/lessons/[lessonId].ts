import type { APIRoute } from "astro";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../../../lib/firebase/server";
import { requireAdmin } from "../../../../../../lib/admin";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, courseVideoKey } from "../../../../../../lib/r2";

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
