import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export function getFirebaseConfig(): FirebaseClientConfig {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function createFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseConfig());
}

function getReactNativeAuthPersistence(): Persistence {
  const authModule = require('firebase/auth') as {
    getReactNativePersistence?: (storage: typeof ReactNativeAsyncStorage) => Persistence;
  };

  if (typeof authModule.getReactNativePersistence !== 'function') {
    throw new Error('Firebase Auth persistence is unavailable in this runtime.');
  }

  return authModule.getReactNativePersistence(ReactNativeAsyncStorage);
}

function createFirebaseAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativeAuthPersistence(),
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') {
      return getAuth(app);
    }

    throw error;
  }
}

export const firebaseApp = createFirebaseApp();
export const auth: Auth = createFirebaseAuth(firebaseApp);
