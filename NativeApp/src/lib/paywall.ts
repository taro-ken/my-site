const PAYWALL_PATTERN = /<p>\s*\[\[more\]\]\s*<\/p>|\[\[more\]\]/g;

export function splitBlogContent(content: string) {
  const hasMarker = PAYWALL_PATTERN.test(content);
  PAYWALL_PATTERN.lastIndex = 0;

  if (!hasMarker) {
    return {
      hasMarker: false,
      freePart: content,
      fullContent: content,
    };
  }

  const parts = content.split(PAYWALL_PATTERN);
  PAYWALL_PATTERN.lastIndex = 0;

  return {
    hasMarker: true,
    freePart: parts[0],
    fullContent: parts.join(''),
  };
}

export function getDisplayContent(content: string, hasAccess: boolean) {
  const { hasMarker, freePart, fullContent } = splitBlogContent(content);
  return hasAccess ? fullContent : freePart;
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>?/gm, '');
}
