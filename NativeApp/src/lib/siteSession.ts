import { buildSiteUrl } from '../config';

export const SITE_SIGN_OUT_REQUEST_MESSAGE = 'taroessence:signout-request';
export const SITE_SIGN_OUT_MESSAGE = 'taroessence:signed-out';

export function buildWebSignOutScript(): string {
  const signOutUrl = buildSiteUrl('/api/auth/signout');

  return `(async function () {
    try {
      await fetch(${JSON.stringify(signOutUrl)}, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {}
    window.ReactNativeWebView?.postMessage(${JSON.stringify(SITE_SIGN_OUT_MESSAGE)});
    true;
  })();`;
}
