import type { APIRoute } from 'astro';
import { ESSENCE_IOS_APP_ID } from '../../lib/essence';

// iOS がアプリのインストール/更新時に取得する。/app へのリンクは、アプリが入っていればアプリで開かれる。
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      applinks: {
        details: [{ appIDs: [ESSENCE_IOS_APP_ID], components: [{ '/': '/app' }] }],
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
