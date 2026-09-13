import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "../../../../lib/firebase/server";
import { getBlogDetail, getBlogs, FILTER_EXCLUDE_GEARLIST } from "../../../../lib/cms";

/**
 * ネイティブアプリ(Essence)向けブログ詳細エンドポイント。kentaro.life/blog/[slug] と同じ
 * データ・同じ有料会員ゲート([[more]]マーカーでの分割)を使う。
 * 有料記事の全文は、Authorizationヘッダー(Firebase IDトークン)で会員(stripe_status=active)
 * と確認できた場合のみ返す。それ以外は無料部分のみ返し、サーバー側で完全に隠す
 * (Web版はブラー表示で本文をクライアントに送ってしまっているが、こちらはより安全に振る舞う)。
 */
const PAYWALL_MARKER = /<p>\s*\[\[more\]\]\s*<\/p>|\[\[more\]\]/g;

async function resolveHasAccess(request: Request, isPremium: boolean): Promise<boolean> {
    if (!isPremium) return true;

    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];
    if (!idToken) return false;

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
        return userDoc.data()?.stripe_status === "active";
    } catch {
        return false;
    }
}

export const GET: APIRoute = async ({ params, request }) => {
    const postId = params.id;
    if (!postId) {
        return new Response(JSON.stringify({ error: "Missing post id" }), { status: 400 });
    }

    try {
        const blog = await getBlogDetail(postId);
        if (blog.gearlist) {
            return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
        }

        const hasAccess = await resolveHasAccess(request, blog.is_premium);

        const hasMarker = PAYWALL_MARKER.test(blog.content);
        PAYWALL_MARKER.lastIndex = 0;
        let freePart = blog.content;
        let fullContent = blog.content;
        if (hasMarker) {
            const parts = blog.content.split(PAYWALL_MARKER);
            freePart = parts[0];
            fullContent = parts.join("");
        }

        const [prevResponse, nextResponse] = await Promise.all([
            getBlogs({
                filters: `publishedAt[less_than]${blog.publishedAt}[and]${FILTER_EXCLUDE_GEARLIST}`,
                orders: "-publishedAt",
                limit: 1,
            }),
            getBlogs({
                filters: `publishedAt[greater_than]${blog.publishedAt}[and]${FILTER_EXCLUDE_GEARLIST}`,
                orders: "publishedAt",
                limit: 1,
            }),
        ]);
        const prevPost = prevResponse.contents[0];
        const nextPost = nextResponse.contents[0];

        return new Response(
            JSON.stringify({
                id: blog.id,
                title: blog.title,
                publishedAt: blog.publishedAt,
                eyecatchUrl: blog.eyecatch?.url ?? null,
                categoryName: blog.category?.name ?? null,
                isPremium: blog.is_premium,
                hasAccess,
                contentHtml: hasAccess ? fullContent : freePart,
                isTruncated: blog.is_premium && !hasAccess,
                previousPost: prevPost ? { id: prevPost.id, title: prevPost.title } : null,
                nextPost: nextPost ? { id: nextPost.id, title: nextPost.title } : null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err: any) {
        console.error("[blog detail] fetch error:", err);
        return new Response(JSON.stringify({ error: "Post not found" }), { status: 404 });
    }
};
