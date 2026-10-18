import { Resend } from "resend";
import { listActiveMemberEmails } from "./member-emails";

const resendApiKey = import.meta.env.RESEND_API_KEY;
const fromAddress =
    import.meta.env.RESEND_FROM_EMAIL || "Essence <hello@taroessence.com>";

export function isResendConfigured(): boolean {
    return Boolean(resendApiKey);
}

function getClient(): Resend {
    if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not set");
    }
    return new Resend(resendApiKey);
}

export type MemberNotifyKind = "podcast" | "course";

export type MemberNotifyPayload = {
    kind: MemberNotifyKind;
    title: string;
    /** メール本文に載せる短い説明(任意) */
    summary?: string;
    /** 開いてほしい URL */
    url: string;
};

type SendResult = {
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    errors: string[];
};

/**
 * Essence会員全員に、Course / Podcast 更新のお知らせを送る。
 * Resend の batch API は最大100件なのでチャンク分割する。
 */
export async function notifyActiveMembers(payload: MemberNotifyPayload): Promise<SendResult> {
    const emails = await listActiveMemberEmails();
    if (emails.length === 0) {
        return { recipientCount: 0, sentCount: 0, failedCount: 0, errors: [] };
    }

    const subject =
        payload.kind === "podcast"
            ? `【Essence】新しいPodcast「${payload.title}」を公開しました`
            : `【Essence】新しい講座「${payload.title}」を公開しました`;

    const kindLabel = payload.kind === "podcast" ? "Podcast" : "講座";
    const summary = payload.summary ? truncate(payload.summary.trim(), 400) : "";
    const summaryHtml = summary
        ? `<p style="margin:16px 0;color:#a1a1aa;line-height:1.7;white-space:pre-wrap;">${escapeHtml(summary)}</p>`
        : "";

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#fafafa;background:#09090b;padding:32px 24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.2em;font-weight:700;color:#34d399;">ESSENCE</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;">新しい${kindLabel}のお知らせ</h1>
        <p style="margin:0;color:#d4d4d8;line-height:1.7;">
          メンバー向けに「${escapeHtml(payload.title)}」を公開しました。
        </p>
        ${summaryHtml}
        <p style="margin:28px 0;">
          <a href="${escapeHtml(payload.url)}"
             style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:6px;">
            ${kindLabel}を見る
          </a>
        </p>
        <p style="margin:32px 0 0;font-size:12px;color:#71717a;line-height:1.6;">
          このメールは Essence メンバーシップ会員の方へお送りしています。<br />
          配信停止をご希望の場合は、アプリまたはサイトのアカウント設定からご案内ください。
        </p>
      </div>
    `;

    const text = [
        `【Essence】新しい${kindLabel}のお知らせ`,
        "",
        `「${payload.title}」を公開しました。`,
        summary ? `\n${summary}\n` : "",
        `${kindLabel}を見る: ${payload.url}`,
        "",
        "このメールは Essence メンバーシップ会員の方へお送りしています。",
    ]
        .filter(Boolean)
        .join("\n");

    const client = getClient();
    const errors: string[] = [];
    let sentCount = 0;

    for (let i = 0; i < emails.length; i += 100) {
        const chunk = emails.slice(i, i + 100);
        const { data, error } = await client.batch.send(
            chunk.map((to) => ({
                from: fromAddress,
                to: [to],
                subject,
                html,
                text,
            }))
        );

        if (error) {
            errors.push(error.message);
            continue;
        }

        // data.data は成功した各メールの { id } 配列
        const ids = data?.data;
        sentCount += Array.isArray(ids) ? ids.length : chunk.length;
    }

    return {
        recipientCount: emails.length,
        sentCount,
        failedCount: Math.max(0, emails.length - sentCount),
        errors,
    };
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function truncate(value: string, max: number): string {
    if (value.length <= max) return value;
    return `${value.slice(0, max).trimEnd()}…`;
}
