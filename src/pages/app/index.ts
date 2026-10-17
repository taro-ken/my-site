import type { APIRoute } from 'astro';

// アプリが入っている端末ではユニバーサルリンクでアプリが開く。ここには届かない。
// ブラウザでは紹介LPへ案内する（ストア直飛ばしより文脈が伝わる）。
export const GET: APIRoute = ({ redirect }) => redirect('/essence', 302);
