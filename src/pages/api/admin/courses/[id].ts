import type { APIRoute } from "astro";
import { adminDb } from "../../../../lib/firebase/server";
import { requireAdmin } from "../../../../lib/admin";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, courseVideoKey } from "../../../../lib/r2";

/**
 * 管理者専用: 講座を、その下のレッスンごと削除する。
 * Firestoreのメタデータに加えて、各レッスンのR2上の動画ファイルも削除する。
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
    const admin = await requireAdmin(cookies);
    if (!admin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const courseId = params.id;
    if (!courseId) {
        return new Response(JSON.stringify({ error: "Missing course id" }), { status: 400 });
    }

    const courseRef = adminDb.collection("courses").doc(courseId);

    const lessonsSnapshot = await courseRef.collection("lessons").get();
    await Promise.all(
        lessonsSnapshot.docs.map((lessonDoc) =>
            r2Client
                .send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: courseVideoKey(courseId, lessonDoc.id) }))
                .catch((err) => console.error("[course delete] R2 delete failed:", err))
        )
    );

    await adminDb.recursiveDelete(courseRef);

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
