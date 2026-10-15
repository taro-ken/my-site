import type { APIRoute } from 'astro';
import { ESSENCE_APP_STORE_URL } from '../../lib/essence';

// https://taroessence.com/app/podcast
// インストール済み → アプリの Podcast 画面 / 未インストール → App Store
export const GET: APIRoute = ({ redirect }) => redirect(ESSENCE_APP_STORE_URL, 302);
