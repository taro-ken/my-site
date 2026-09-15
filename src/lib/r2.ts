import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2(S3互換API)クライアント。Podcast音声の保存・配信に使う。
 * 転送量(egress)が無料なため、再生数が増えてもコストが増えない。
 */
export const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${import.meta.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: import.meta.env.R2_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.R2_SECRET_ACCESS_KEY,
    },
});

export const R2_BUCKET_NAME = import.meta.env.R2_BUCKET_NAME;

export const PODCAST_AUDIO_CONTENT_TYPE = "audio/mp4";

export function podcastAudioKey(episodeId: string): string {
    return `${episodeId}.m4a`;
}

export const COURSE_VIDEO_CONTENT_TYPE = "video/mp4";

export function courseVideoKey(courseId: string, lessonId: string): string {
    return `courses/${courseId}/lessons/${lessonId}.mp4`;
}
