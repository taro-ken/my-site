import type { APIRoute } from "astro";
import { getCategories } from "../../../lib/cms";

/**
 * ネイティブアプリ(Essence)向けブログカテゴリ一覧エンドポイント。公開情報のため認証不要。
 */
export const GET: APIRoute = async () => {
    try {
        const response = await getCategories();
        const categories = response.contents.map((cat) => ({ id: cat.id, name: cat.name }));

        return new Response(JSON.stringify({ categories }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[blog categories] fetch error:", err);
        return new Response(JSON.stringify({ error: "Failed to fetch categories" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
