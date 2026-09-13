import type { APIRoute } from "astro";
import {
    getAllBlogs,
    mergeBlogFilters,
    FILTER_EXCLUDE_GEARLIST,
    type BlogItem,
} from "../../../lib/cms";

/**
 * ネイティブアプリ(Essence)向けブログ一覧エンドポイント。
 * kentaro.life/blog と同じデータソース(microCMS)・同じ絞り込み条件を使う。
 * ブログ一覧は公開情報なので認証不要。
 */
const HIDDEN_ROADMAP_ID = import.meta.env.MICROCMS_ENGINEERING_ROADMAP_ID || "gpx2f-h9gox";

const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, "");

function serialize(blog: BlogItem) {
    return {
        id: blog.id,
        title: blog.title,
        excerpt: stripHtml(blog.content).slice(0, 200),
        isPremium: blog.is_premium,
        publishedAt: blog.publishedAt,
        eyecatchUrl: blog.eyecatch?.url ?? null,
        categoryId: blog.category?.id ?? null,
        categoryName: blog.category?.name ?? null,
    };
}

export const GET: APIRoute = async ({ url }) => {
    const categoryId = url.searchParams.get("category");

    try {
        const filters = mergeBlogFilters(
            categoryId ? `category[equals]${categoryId}` : undefined,
            FILTER_EXCLUDE_GEARLIST
        );
        const response = await getAllBlogs(filters ? { filters } : undefined);
        const posts = response.contents
            .filter((blog) => blog.id !== HIDDEN_ROADMAP_ID && !blog.gearlist)
            .map(serialize);

        return new Response(JSON.stringify({ posts }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[blog posts] fetch error:", err);
        return new Response(JSON.stringify({ error: "Failed to fetch posts" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
