export const SITE_ORIGIN = 'https://kentaro.life';

/** WebView からの表示をサイト側で判別するための User-Agent サフィックス */
export const APP_WEBVIEW_USER_AGENT = 'TaroEssenceApp/1.0';

export const TAB_ROUTES = {
  contents: '/product',
  blog: '/blog',
  gear: '/all-item-list',
  membership: '/membership',
} as const;

/** Web の `pt-32`（8rem）に合わせたネイティブ画面上部余白 */
export { APP_PAGE_TOP_PADDING } from './lib/appPageHeader';

type BuildSiteUrlOptions = {
  embed?: boolean;
};

function withEmbedParam(url: URL, embed?: boolean) {
  if (embed) {
    url.searchParams.set('app', '1');
  }

  return url.toString();
}

export function buildSiteUrl(path?: string, options?: BuildSiteUrlOptions): string {
  if (typeof path !== 'string' || path.length === 0) {
    return withEmbedParam(new URL(SITE_ORIGIN), options?.embed);
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return withEmbedParam(new URL(path), options?.embed);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return withEmbedParam(new URL(normalizedPath, SITE_ORIGIN), options?.embed);
}

export function isInternalSiteUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'kentaro.life' || hostname === 'www.kentaro.life';
  } catch {
    return false;
  }
}
