import type { APIRoute } from 'astro';

import { getBlogs } from '../lib/cms';

const siteUrl = 'https://kentaro.vercel.app';

const staticPages = [
  '',
  '/all-item-list',
  '/personal-projects',
  '/services',
  '/contact',
  '/blog',
  '/pricing',
];

export const GET: APIRoute = async () => {
  // Fetch blogs for dynamic URLs
  let blogs: any[] = [];
  try {
    const response = await getBlogs({ limit: 100 });
    blogs = response.contents;
  } catch (error) {
    console.error("Sitemap: Failed to fetch blogs", error);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
      .map(
        (path) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`
      )
      .join('\n')}
${blogs
      .map(
        (blog) => `  <url>
    <loc>${siteUrl}/blog/${blog.id}</loc>
    <lastmod>${new Date(blog.updatedAt || blog.publishedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
      )
      .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};

