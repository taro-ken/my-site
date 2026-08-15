import { getMicroCmsConfig } from './env';
import type { BlogItem } from './cms';

export function formatBlogDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getEyecatchUrl(url: string, width = 600) {
  return `${url}?w=${width}&q=80&fmt=webp`;
}

export function isPublicBlogItem(blog: BlogItem) {
  const { hiddenRoadmapId } = getMicroCmsConfig();
  return blog.id !== hiddenRoadmapId && !blog.gearlist;
}
