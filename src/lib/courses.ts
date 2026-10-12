import type { AstroCookies } from "astro";
import { adminAuth, adminDb } from "./firebase/server";

/** Web(Stripe)・アプリ内課金(StoreKit)のどちらで課金していても会員として扱う。 */
export function isActiveMember(data: FirebaseFirestore.DocumentData | undefined): boolean {
    return data?.stripe_status === "active" || data?.apple_status === "active";
}

/** セッションCookieから会員のuidを返す。未ログイン・非会員は null。API ルート用(middleware は /api を素通しするため)。 */
export async function requireMemberUid(cookies: AstroCookies): Promise<string | null> {
    const sessionCookie = cookies.get("session")?.value;
    if (!sessionCookie) return null;
    try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        return isActiveMember(userDoc.data()) ? decoded.uid : null;
    } catch {
        return null;
    }
}

export type WebCourse = {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    category: string;
    lessonCount: number;
};

export type WebLesson = {
    id: string;
    title: string;
    description: string;
    chapterTitle: string | null;
};

export function toWebCourse(doc: FirebaseFirestore.DocumentSnapshot): WebCourse {
    const data = doc.data() ?? {};
    return {
        id: doc.id,
        title: (data.title as string) ?? "",
        description: (data.description as string) ?? "",
        thumbnailUrl: (data.thumbnailUrl as string) ?? "",
        category: (data.category as string) ?? "",
        lessonCount: (data.lessonCount as number) ?? 0,
    };
}

export async function fetchCompletedLessonIds(uid: string, courseId: string): Promise<string[]> {
    const doc = await adminDb.collection("users").doc(uid).collection("courseProgress").doc(courseId).get();
    return (doc.data()?.completedLessonIds as string[]) ?? [];
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const LINK_CLASS = 'class="text-emerald-300 underline underline-offset-4 hover:text-emerald-200 break-all" target="_blank" rel="noopener noreferrer"';

/** Markdown の [text](url) と生の URL だけをリンクにし、それ以外はエスケープした HTML を返す。 */
export function linkifyDescription(text: string): string {
    const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
    let html = "";
    let lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
        html += escapeHtml(text.slice(lastIndex, match.index));
        const url = match[2] ?? match[3];
        const label = match[1] ?? match[3];
        html += `<a href="${escapeHtml(url)}" ${LINK_CLASS}>${escapeHtml(label)}</a>`;
        lastIndex = (match.index ?? 0) + match[0].length;
    }
    html += escapeHtml(text.slice(lastIndex));
    return html.replace(/\n/g, "<br />");
}

type DescriptionSegment = { kind: "text" | "copy"; value: string };

/**
 * 説明文を「普通の文章」と「コピー用ブロック」に分ける(アプリの DescriptionSegment.parse と同じ規則)。
 * 「▼…コピー」の行から「▲」の行までがコピー用ブロック。終わりの印が無ければ全体を普通の文章として扱う。
 */
function parseDescription(source: string): DescriptionSegment[] {
    const lines = source.split("\n");
    const segments: DescriptionSegment[] = [];
    let textBuffer: string[] = [];
    let copyBuffer: string[] = [];
    let inCopy = false;
    let blockStart = 0;

    const flushText = () => {
        const joined = textBuffer.join("\n").trim();
        if (joined) segments.push({ kind: "text", value: joined });
        textBuffer = [];
    };

    lines.forEach((line, index) => {
        if (!inCopy) {
            if (line.includes("▼") && line.includes("コピー")) {
                flushText();
                inCopy = true;
                blockStart = index;
                copyBuffer = [];
            } else {
                textBuffer.push(line);
            }
        } else if (line.includes("▲")) {
            const body = copyBuffer.join("\n").trim();
            if (body) segments.push({ kind: "copy", value: body });
            inCopy = false;
        } else {
            copyBuffer.push(line);
        }
    });
    if (inCopy) textBuffer.push(...lines.slice(blockStart));
    flushText();
    return segments;
}

/** 説明文を HTML にする。コピー用ブロックは「コピー」ボタン付きのカードになる(クリック処理はページ側)。 */
export function renderDescription(text: string): string {
    return parseDescription(text)
        .map((segment) =>
            segment.kind === "text"
                ? `<div>${linkifyDescription(segment.value)}</div>`
                : `<div class="copy-block"><div class="copy-block-head"><span>コピーして使う</span><button type="button" class="copy-block-btn">コピー</button></div><pre class="copy-block-body">${escapeHtml(segment.value)}</pre></div>`
        )
        .join("");
}

/** 一覧のプレビュー用に、Markdown リンクを表示テキストだけにする。 */
export function plainDescription(text: string): string {
    return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1");
}
