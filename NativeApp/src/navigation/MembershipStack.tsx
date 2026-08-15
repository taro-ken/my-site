import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, type User } from 'firebase/auth';
import SessionBootstrapWebView from '../components/SessionBootstrapWebView';
import SessionClearWebView from '../components/SessionClearWebView';
import SiteWebView from '../components/SiteWebView';
import { MembershipAuthProvider } from '../context/MembershipAuthContext';
import {
  getValidStoredIdToken,
  refreshStoredIdToken,
} from '../lib/appAuthSession';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { setTokenSessionNotifier, signOutFromApp } from '../lib/identityAuth';
import LoginScreen from '../screens/LoginScreen';
import MembershipHomeScreen from '../screens/MembershipHomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import type { MembershipStackParamList } from './types';

const Stack = createNativeStackNavigator<MembershipStackParamList>();

export default function MembershipStack() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [bootstrapToken, setBootstrapToken] = useState<string | null>(null);
  const [isBootstrappingWebSession, setIsBootstrappingWebSession] = useState(false);
  const [memberWebPath, setMemberWebPath] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isClearingWebSession, setIsClearingWebSession] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [restSessionActive, setRestSessionActive] = useState(false);
  const previousUserRef = useRef<User | null>(null);
  const bootstrapUserIdRef = useRef<string | null>(null);
  const memberWebPathRef = useRef<string | null>(null);
  const isSigningOutRef = useRef(false);
  const pendingWebSessionClearRef = useRef(false);

  const resetMemberState = useCallback(() => {
    memberWebPathRef.current = null;
    setMemberWebPath(null);
    setBootstrapToken(null);
    setIsBootstrappingWebSession(false);
    bootstrapUserIdRef.current = null;
  }, []);

  const beginSessionBootstrap = useCallback(async (idToken: string, userId?: string | null) => {
    if (isSigningOutRef.current) {
      setBootstrapError('ログイン処理を完了できませんでした。しばらくしてから再度お試しください。');
      setRestSessionActive(false);
      setIsBootstrappingWebSession(false);
      return;
    }

    if (userId && bootstrapUserIdRef.current === userId && memberWebPathRef.current) {
      return;
    }

    if (userId) {
      bootstrapUserIdRef.current = userId;
    }

    memberWebPathRef.current = null;
    setMemberWebPath(null);
    setBootstrapToken(null);
    setIsBootstrappingWebSession(true);
    setBootstrapError(null);
    setBootstrapToken(idToken);
  }, []);

  const startSessionBootstrap = useCallback(
    async (nextUser: User) => {
      if (isSigningOutRef.current) {
        return;
      }

      setRestSessionActive(true);

      try {
        const token = await nextUser.getIdToken();
        if (isSigningOutRef.current) {
          return;
        }

        await beginSessionBootstrap(token, nextUser.uid);
      } catch {
        setBootstrapError('セッションの準備に失敗しました。');
        setIsBootstrappingWebSession(false);
        setRestSessionActive(false);
        await signOutFromApp();
      }
    },
    [beginSessionBootstrap],
  );

  const endSession = useCallback(async () => {
    if (isSigningOutRef.current) {
      return;
    }

    isSigningOutRef.current = true;
    setIsSigningOut(true);
    pendingWebSessionClearRef.current = true;
    setBootstrapError(null);
    previousUserRef.current = null;
    setFirebaseUser(null);
    setRestSessionActive(false);
    resetMemberState();
    setWebViewKey((value) => value + 1);
    setIsClearingWebSession(true);

    try {
      await signOutFromApp();
    } catch (error) {
      console.error('Failed to sign out from app', error);
      setBootstrapError('ログアウトに失敗しました。');
    } finally {
      isSigningOutRef.current = false;
      setIsSigningOut(false);
    }
  }, [resetMemberState]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsCheckingAuth(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      const hadUser = previousUserRef.current !== null;
      setIsCheckingAuth(false);

      if (nextUser) {
        if (isSigningOutRef.current) {
          return;
        }

        pendingWebSessionClearRef.current = false;
        setIsClearingWebSession(false);
        setRestSessionActive(true);
        previousUserRef.current = nextUser;
        setFirebaseUser(nextUser);
        void startSessionBootstrap(nextUser);
        return;
      }

      if (!nextUser) {
        previousUserRef.current = null;
        isSigningOutRef.current = false;
        setIsSigningOut(false);
        setFirebaseUser(null);

        if (hadUser) {
          setRestSessionActive(false);
          resetMemberState();
          pendingWebSessionClearRef.current = true;
          setWebViewKey((value) => value + 1);
          setIsClearingWebSession(true);
        }

        return;
      }
    });

    return unsubscribeAuth;
  }, [resetMemberState, startSessionBootstrap]);

  useEffect(() => {
    setTokenSessionNotifier((idToken) => {
      if (isSigningOutRef.current) {
        setBootstrapError('ログイン処理を完了できませんでした。しばらくしてから再度お試しください。');
        return;
      }

      pendingWebSessionClearRef.current = false;
      setIsClearingWebSession(false);
      setRestSessionActive(true);
      void beginSessionBootstrap(idToken);
    });

    return () => {
      setTokenSessionNotifier(null);
    };
  }, [beginSessionBootstrap]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (auth.currentUser || isSigningOutRef.current) {
        return;
      }

      const idToken = (await getValidStoredIdToken()) ?? (await refreshStoredIdToken());

      if (!idToken || cancelled || auth.currentUser || isSigningOutRef.current) {
        return;
      }

      setRestSessionActive(true);
      await beginSessionBootstrap(idToken);
    })();

    return () => {
      cancelled = true;
    };
  }, [beginSessionBootstrap]);

  const showAuthenticatedArea =
    (Boolean(firebaseUser) || restSessionActive) && !isSigningOut;

  const renderBody = () => {
    if (isClearingWebSession) {
      return (
        <SessionClearWebView
          onComplete={() => {
            const shouldFinalizeLogout = pendingWebSessionClearRef.current;
            pendingWebSessionClearRef.current = false;
            setIsClearingWebSession(false);
            setWebViewKey((value) => value + 1);

            if (shouldFinalizeLogout && auth.currentUser) {
              void signOutFromApp();
            }
          }}
        />
      );
    }

    if (showAuthenticatedArea) {
      if (isBootstrappingWebSession && !bootstrapToken) {
        return (
          <View style={styles.centered}>
            <ActivityIndicator color="#BF953F" size="large" />
          </View>
        );
      }

      if (isBootstrappingWebSession && bootstrapToken) {
        return (
          <SessionBootstrapWebView
            idToken={bootstrapToken}
            onComplete={(path) => {
              if (isSigningOutRef.current) {
                return;
              }

              memberWebPathRef.current = path;
              setMemberWebPath(path);
              setIsBootstrappingWebSession(false);
              setBootstrapToken(null);
              setBootstrapError(null);
            }}
            onFailure={(message) => {
              setBootstrapError(message ?? 'ログイン状態の同期に失敗しました。');
              setIsBootstrappingWebSession(false);
              setBootstrapToken(null);
              setRestSessionActive(false);
              void signOutFromApp();
            }}
          />
        );
      }

      if (memberWebPath) {
        return (
          <SiteWebView
            path={memberWebPath}
            remountKey={webViewKey}
            onSessionEnded={() => {
              void endSession();
            }}
          />
        );
      }

      return (
        <View style={styles.centered}>
          <ActivityIndicator color="#BF953F" size="large" />
          {bootstrapError ? <Text style={styles.errorText}>{bootstrapError}</Text> : null}
        </View>
      );
    }

    return (
      <View style={styles.authContainer}>
        {bootstrapError ? <Text style={styles.errorText}>{bootstrapError}</Text> : null}
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MembershipHome" component={MembershipHomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} initialParams={{ registered: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      </View>
    );
  };

  if (!isFirebaseConfigured()) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Firebase の設定がありません。NativeApp/.env の EXPO_PUBLIC_FIREBASE_* を確認してください。
        </Text>
      </View>
    );
  }

  if (isCheckingAuth) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#BF953F" size="large" />
      </View>
    );
  }

  return (
    <MembershipAuthProvider
      webViewKey={webViewKey}
      endSession={endSession}
      authError={bootstrapError}
      clearAuthError={() => setBootstrapError(null)}
    >
      {renderBody()}
    </MembershipAuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
