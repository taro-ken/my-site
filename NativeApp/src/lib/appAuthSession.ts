import AsyncStorage from '@react-native-async-storage/async-storage';
import { SITE_ORIGIN } from '../config';
import { getFirebaseConfig } from './firebase';

const REFRESH_TOKEN_STORAGE_KEY = 'taroessence.auth.refreshToken';
const ID_TOKEN_STORAGE_KEY = 'taroessence.auth.idToken';
const SESSION_PATH_STORAGE_KEY = 'taroessence.auth.sessionPath';

type StoredIdToken = {
  idToken: string;
  expiresAt: number;
};

type RefreshTokenResponse = {
  id_token?: string;
  refresh_token?: string;
  error?: {
    message?: string;
  };
};

function getIdTokenExpiry(idToken: string): number | null {
  try {
    const [, payload] = idToken.split('.');
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };

    if (typeof decoded.exp !== 'number') {
      return null;
    }

    return decoded.exp * 1000;
  } catch {
    return null;
  }
}

export async function storeRefreshToken(refreshToken: string) {
  await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export async function storeIdToken(idToken: string) {
  const expiresAt = getIdTokenExpiry(idToken);

  if (!expiresAt) {
    return;
  }

  const payload: StoredIdToken = { idToken, expiresAt };
  await AsyncStorage.setItem(ID_TOKEN_STORAGE_KEY, JSON.stringify(payload));
}

export async function storeSessionPath(path: string) {
  await AsyncStorage.setItem(SESSION_PATH_STORAGE_KEY, path);
}

export async function getStoredSessionPath(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_PATH_STORAGE_KEY);
}

export async function clearStoredAuthSession() {
  await AsyncStorage.multiRemove([
    REFRESH_TOKEN_STORAGE_KEY,
    ID_TOKEN_STORAGE_KEY,
    SESSION_PATH_STORAGE_KEY,
  ]);
}

export async function clearFirebaseAuthPersistence() {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter((key) => key.startsWith('firebase:'));

  if (authKeys.length > 0) {
    await AsyncStorage.multiRemove(authKeys);
  }
}

export async function getValidStoredIdToken(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(ID_TOKEN_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as StoredIdToken;

    if (!payload.idToken || payload.expiresAt <= Date.now() + 60_000) {
      await AsyncStorage.removeItem(ID_TOKEN_STORAGE_KEY);
      return null;
    }

    return payload.idToken;
  } catch {
    await AsyncStorage.removeItem(ID_TOKEN_STORAGE_KEY);
    return null;
  }
}

export async function refreshStoredIdToken(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

  if (!refreshToken) {
    return null;
  }

  const { apiKey } = getFirebaseConfig();

  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: SITE_ORIGIN,
      Referer: `${SITE_ORIGIN}/`,
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  const payload = (await response.json()) as RefreshTokenResponse;

  if (!response.ok || !payload.id_token) {
    return null;
  }

  if (payload.refresh_token) {
    await storeRefreshToken(payload.refresh_token);
  }

  await storeIdToken(payload.id_token);
  return payload.id_token;
}
