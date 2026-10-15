/**
 * Essence の新規参加(Stripe決済)を受け付けるか。
 * false の間は参加ボタンを「準備中」にし、決済への導線・決済APIも止める。募集再開時は true に戻す。
 */
export const ESSENCE_JOIN_OPEN = false;

/** App Store Connect の「Apple ID」(数字)。空の間は /app から紹介ページへ案内する。 */
export const ESSENCE_APP_STORE_ID = '';

export const ESSENCE_APP_STORE_URL = ESSENCE_APP_STORE_ID
  ? `https://apps.apple.com/jp/app/id${ESSENCE_APP_STORE_ID}`
  : '/essence';

/** ユニバーサルリンクの対象アプリ(<Team ID>.<Bundle ID>)。 */
export const ESSENCE_IOS_APP_ID = 'ZCR4QT36HT.com.kk.essence';

/**
 * iOSアプリの強制アップデート用。これ未満のバージョンは起動時に更新を求める。
 * 例: 次の必須アップデートを 1.1 にしたら '1.1' に上げる(アプリの再提出は不要)。
 * 今の公開版は 1.0 なので、当面は '1.0' のまま(=強制はかからない)。
 */
export const ESSENCE_IOS_MINIMUM_VERSION = '1.0';
