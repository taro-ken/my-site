import { createClient } from "microcms-js-sdk";

export const microcmsClient = createClient({
    serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN || "placeholder-domain",
    apiKey: import.meta.env.MICROCMS_API_KEY || "placeholder-api-key",
});

// Blog Type Definitions
export type Category = {
    id: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    revisedAt: string;
    name: string;
};

export type BlogItem = {
    id: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    revisedAt: string;
    title: string;
    content: string;
    is_premium: boolean;
    eyecatch?: {
        url: string;
        height: number;
        width: number;
    };
    category?: Category;
};

export type CategoryResponse = {
    totalCount: number;
    offset: number;
    limit: number;
    contents: Category[];
};

export type BlogResponse = {
    totalCount: number;
    offset: number;
    limit: number;
    contents: BlogItem[];
};

// Fetch list of blogs
export const getBlogs = async (queries?: any) => {
    return await microcmsClient.get<BlogResponse>({ endpoint: "blogs", queries });
};

// Fetch all blogs with pagination support (microCMS default limit is 10)
export const getAllBlogs = async (queries?: any) => {
    const limit = 100;
    let offset = 0;
    let totalCount = 0;
    const contents: BlogItem[] = [];

    do {
        const response = await getBlogs({
            ...queries,
            limit,
            offset,
        });

        totalCount = response.totalCount;
        contents.push(...response.contents);
        offset += response.contents.length;
    } while (offset < totalCount);

    return {
        totalCount,
        offset: 0,
        limit: contents.length,
        contents,
    } satisfies BlogResponse;
};

// Fetch list of categories
export const getCategories = async (queries?: any) => {
    return await microcmsClient.get<CategoryResponse>({ endpoint: "categories", queries });
};

// Fetch single blog
export const getBlogDetail = async (
    blogId: string,
    queries?: any
) => {
    return await microcmsClient.getListDetail<BlogItem>({
        endpoint: "blogs",
        contentId: blogId,
        queries,
    });
};
