import type { APIRoute } from 'astro';
import {
  ESSENCE_APP_STORE_URL,
  ESSENCE_IOS_MINIMUM_VERSION,
} from '../../../lib/essence';

/** Essence iOSアプリが起動時に読む設定。認証不要。 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      minimumVersion: ESSENCE_IOS_MINIMUM_VERSION,
      // App Store ID 未設定の間は /app → /essence に落ちる。ID 設定後はストアへ。
      storeUrl: ESSENCE_APP_STORE_URL.startsWith('http')
        ? ESSENCE_APP_STORE_URL
        : 'https://taroessence.com/app',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
