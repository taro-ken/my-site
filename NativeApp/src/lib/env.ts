const serviceDomain = process.env.EXPO_PUBLIC_MICROCMS_SERVICE_DOMAIN ?? '';
const apiKey = process.env.EXPO_PUBLIC_MICROCMS_API_KEY ?? '';
const hiddenRoadmapId = process.env.EXPO_PUBLIC_MICROCMS_ENGINEERING_ROADMAP_ID ?? 'gpx2f-h9gox';

export function getMicroCmsConfig() {
  return {
    serviceDomain,
    apiKey,
    hiddenRoadmapId,
  };
}

export function isMicroCmsConfigured(): boolean {
  const { serviceDomain, apiKey } = getMicroCmsConfig();
  return Boolean(serviceDomain && apiKey);
}
