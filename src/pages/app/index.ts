import type { APIRoute } from 'astro';
import { ESSENCE_APP_STORE_URL } from '../../lib/essence';

// アプリが入っている端末ではユニバーサルリンクでアプリが開く。ここには届かない。
export const GET: APIRoute = ({ redirect }) => redirect(ESSENCE_APP_STORE_URL, 302);
