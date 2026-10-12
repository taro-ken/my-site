import type { APIRoute } from "astro";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, courseThumbnailKey } from "../../../../lib/r2";

const SIGNED_URL_EXPIRES_SECONDS = 3600;

/**
 * 講座のサムネイル画像(公開)。非公開のR2上の画像へ、署名付きURLでリダイレクトする。
 */
export const GET: APIRoute = async ({ params }) => {
    const courseId = params.courseId;
    if (!courseId) {
        return new Response("Not found", { status: 404 });
    }

    const signedUrl = await getSignedUrl(
        r2Client,
        new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: courseThumbnailKey(courseId) }),
        { expiresIn: SIGNED_URL_EXPIRES_SECONDS }
    );

    return new Response(null, {
        status: 302,
        headers: {
            Location: signedUrl,
            // 署名の有効期限より短くキャッシュさせる
            "Cache-Control": `public, max-age=${SIGNED_URL_EXPIRES_SECONDS - 600}`,
        },
    });
};
