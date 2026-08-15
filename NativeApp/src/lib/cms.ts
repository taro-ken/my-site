import { createClient } from 'microcms-js-sdk';
import { getMicroCmsConfig } from './env';

const { serviceDomain, apiKey } = getMicroCmsConfig();

export const microcmsClient = createClient({
  serviceDomain: serviceDomain || 'placeholder-domain',
  apiKey: apiKey || 'placeholder-api-key',
});

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
  gearlist?: boolean;
  eyecatch?: {
    url: string;
    height: number;
    width: number;
  };
  category?: Category;
};

export const FILTER_EXCLUDE_GEARLIST = 'gearlist[equals]false';

export function mergeBlogFilters(...parts: (string | undefined)[]): string | undefined {
  const valid = parts.filter((part): part is string => Boolean(part));
  if (valid.length === 0) {
    return undefined;
  }

  return valid.length === 1 ? valid[0] : valid.join('[and]');
}

type BlogResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: BlogItem[];
};

type CategoryResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: Category[];
};

export async function getBlogs(queries?: Record<string, unknown>) {
  return microcmsClient.get<BlogResponse>({ endpoint: 'blogs', queries });
}

export async function getAllBlogs(queries?: Record<string, unknown>) {
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
}

export async function getCategories(queries?: Record<string, unknown>) {
  return microcmsClient.get<CategoryResponse>({ endpoint: 'categories', queries });
}

export async function getBlogDetail(blogId: string, queries?: Record<string, unknown>) {
  return microcmsClient.getListDetail<BlogItem>({
    endpoint: 'blogs',
    contentId: blogId,
    queries,
  });
}
