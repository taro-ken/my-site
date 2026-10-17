import type { APIRoute } from 'astro';

// https://taroessence.com/app/podcast
// インストール済み → アプリの Podcast 画面 / ブラウザ → 紹介LP
export const GET: APIRoute = ({ redirect }) => redirect('/essence', 302);
