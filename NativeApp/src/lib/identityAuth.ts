import {
  signOut,
} from 'firebase/auth';
import { SITE_ORIGIN } from '../config';
import {
  clearFirebaseAuthPersistence,
  clearStoredAuthSession,
  storeIdToken,
  storeRefreshToken,
} from './appAuthSession';
import { auth, getFirebaseConfig } from './firebase';

type IdentityToolkitError = {
  error?: {
    message?: string;
    details?: Array<{
      reason?: string;
    }>;
  };
};

type IdentityToolkitAuthResponse = {
  idToken?: string;
  refreshToken?: string;
};

let tokenSessionNotifier: ((idToken: string) => void) | null = null;

export function setTokenSessionNotifier(notifier: ((idToken: string) => void) | null) {
  tokenSessionNotifier = notifier;
}

function getAuthErrorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return '';
}

function getIdentityToolkitErrorCode(payload: IdentityToolkitError): string {
  const message = payload.error?.message ?? '';
  const reason = payload.error?.details?.find((detail) => detail.reason)?.reason ?? '';
  return `${reason} ${message}`.trim();
}

function createIdentityAuthError(code: string) {
  const error = new Error(code);
  (error as Error & { code: string }).code = code;
  return error;
}

function isApiKeyRestrictionError(code: string): boolean {
  return (
    code.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
    code.includes('invalid-api-key') ||
    code.includes('PERMISSION_DENIED') ||
    code.includes('forbidden')
  );
}

async function postIdentityToolkit<T>(
  endpoint: 'signInWithPassword' | 'signUp',
  body: Record<string, unknown>,
): Promise<T> {
  const { apiKey } = getFirebaseConfig();

  if (!apiKey) {
    throw createIdentityAuthError('auth/invalid-api-key');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: SITE_ORIGIN,
        Referer: `${SITE_ORIGIN}/`,
      },
      body: JSON.stringify({
        ...body,
        returnSecureToken: true,
      }),
    },
  );

  const payload = (await response.json()) as T & IdentityToolkitError;

  if (!response.ok) {
    throw createIdentityAuthError(getIdentityToolkitErrorCode(payload));
  }

  return payload;
}

async function createAuthSession(
  endpoint: 'signInWithPassword' | 'signUp',
  email: string,
  password: string,
) {
  const payload = await postIdentityToolkit<IdentityToolkitAuthResponse>(endpoint, {
    email,
    password,
  });

  if (!payload.idToken || !payload.refreshToken) {
    throw createIdentityAuthError('auth/invalid-credential');
  }

  await storeRefreshToken(payload.refreshToken);
  await storeIdToken(payload.idToken);
  tokenSessionNotifier?.(payload.idToken);
}

export async function signInWithEmailForApp(email: string, password: string) {
  await createAuthSession('signInWithPassword', email, password);
}

export async function createUserWithEmailForApp(email: string, password: string) {
  await createAuthSession('signUp', email, password);
}

export async function signOutFromApp() {
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (error) {
    console.error('Firebase signOut failed', error);
  }

  await clearStoredAuthSession();
  await clearFirebaseAuthPersistence();
}

export function getIdentityAuthErrorMessage(
  error: unknown,
  purpose: 'login' | 'register' = 'login',
): string {
  const code = getAuthErrorCode(error);

  if (isApiKeyRestrictionError(code)) {
    return 'Firebase API キーの制限によりアプリから認証できません。Google Cloud でモバイル向けキーを設定してください。';
  }

  if (
    code.includes('INVALID_PASSWORD') ||
    code.includes('INVALID_LOGIN_CREDENTIALS') ||
    code.includes('invalid-credential') ||
    code.includes('wrong-password')
  ) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }

  if (code.includes('EMAIL_NOT_FOUND') || code.includes('user-not-found')) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }

  if (code.includes('EMAIL_EXISTS') || code.includes('email-already-in-use')) {
    return 'このメールアドレスは既に登録されています。';
  }

  if (code.includes('WEAK_PASSWORD') || code.includes('weak-password')) {
    return 'パスワードが弱すぎます。より強いパスワードを設定してください。';
  }

  if (code.includes('INVALID_EMAIL') || code.includes('invalid-email')) {
    return 'メールアドレスの形式が正しくありません。';
  }

  if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER') || code.includes('too-many-requests')) {
    return '試行回数が多すぎます。しばらくしてから再度お試しください。';
  }

  return purpose === 'register'
    ? '登録に失敗しました。入力内容を確認してください。'
    : 'ログインに失敗しました。入力内容を確認してください。';
}
