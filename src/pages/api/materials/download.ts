import type { APIRoute } from 'astro';
import { adminAuth } from '../../../lib/firebase/server';
import { verifyLearningMaterialsCheckoutSessionForUser } from '../../../lib/stripe-materials';
import { hasLearningMaterialsPurchase } from '../../../lib/learning-materials-access';

/**
 * ログイン必須。
 * - `?session_id=` … その決済が当該ユーザー分かつ支払い済みなら OK（Webhook 前の即時 DL 用）
 * - パラメータなし … Firestore の購入フラグで OK（いつでも再ダウンロード）
 */
export const GET: APIRoute = async ({ url, redirect, cookies }) => {
  const sessionCookie = cookies.get('session')?.value;
  if (!sessionCookie) {
    return new Response('ログインが必要です', { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return new Response('ログインが必要です', { status: 401 });
  }

  const sessionId = url.searchParams.get('session_id');
  if (sessionId) {
    const verified = await verifyLearningMaterialsCheckoutSessionForUser(sessionId, uid);
    if (!verified.ok) {
      return new Response('購入の確認ができませんでした', { status: 403 });
    }
  } else {
    const purchased = await hasLearningMaterialsPurchase(uid);
    if (!purchased) {
      return new Response('教材の購入が見つかりません', { status: 403 });
    }
  }

  const downloadUrl = import.meta.env.MATERIALS_DOWNLOAD_URL;
  if (!downloadUrl) {
    return new Response('ダウンロード URL がサーバーに設定されていません（MATERIALS_DOWNLOAD_URL）', { status: 503 });
  }

  return redirect(downloadUrl, 302);
};
