import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewOpenWindowEvent,
} from 'react-native-webview/lib/WebViewTypes';
import * as WebBrowser from 'expo-web-browser';
import { APP_WEBVIEW_USER_AGENT, buildSiteUrl, isInternalSiteUrl } from '../config';
import { APP_EMBED_HIDING_SCRIPT } from '../lib/appEmbedScript';
import {
  buildWebSignOutScript,
  SITE_SIGN_OUT_MESSAGE,
  SITE_SIGN_OUT_REQUEST_MESSAGE,
} from '../lib/siteSession';

type SiteWebViewProps = {
  path?: string;
  remountKey?: number | string;
  onInterceptInternalPath?: (pathname: string) => boolean;
  onSessionEnded?: () => void;
};

function getComparableUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function ensureEmbedQuery(url: string) {
  try {
    const parsed = new URL(url);
    if (!isInternalSiteUrl(url)) {
      return url;
    }

    parsed.searchParams.set('app', '1');
    return parsed.toString();
  } catch {
    return url;
  }
}

export default function SiteWebView({
  path = '/',
  remountKey,
  onInterceptInternalPath,
  onSessionEnded,
}: SiteWebViewProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const pendingSignOutRef = useRef(false);
  const signOutFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootUrl = useMemo(() => buildSiteUrl(path, { embed: true }), [path]);
  const rootComparableUrl = useMemo(() => getComparableUrl(rootUrl), [rootUrl]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  const clearSignOutFallback = useCallback(() => {
    if (signOutFallbackTimerRef.current) {
      clearTimeout(signOutFallbackTimerRef.current);
      signOutFallbackTimerRef.current = null;
    }
  }, []);

  const completeSignOut = useCallback(() => {
    clearSignOutFallback();
    pendingSignOutRef.current = false;
    onSessionEnded?.();
  }, [clearSignOutFallback, onSessionEnded]);

  const requestWebSignOut = useCallback(() => {
    if (!onSessionEnded) {
      webViewRef.current?.injectJavaScript(
        `window.location.assign(${JSON.stringify(buildSiteUrl('/api/auth/signout'))}); true;`,
      );
      return;
    }

    onSessionEnded();
  }, [onSessionEnded]);

  useEffect(() => clearSignOutFallback, [clearSignOutFallback]);

  const applyEmbedHiding = useCallback(() => {
    webViewRef.current?.injectJavaScript(APP_EMBED_HIDING_SCRIPT);
  }, []);

  const openExternalUrl = useCallback(async (url: string) => {
    if (!url) {
      return;
    }

    await WebBrowser.openBrowserAsync(url);
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest) => {
      const { url } = request;

      if (!url || url === 'about:blank') {
        return true;
      }

      if (isInternalSiteUrl(url)) {
        try {
          const { pathname } = new URL(url);

          if (pathname === '/api/auth/signout' && onSessionEnded) {
            onSessionEnded();
            return false;
          }

          if (onInterceptInternalPath?.(pathname)) {
            return false;
          }
        } catch {
          // fall through
        }

        return true;
      }

      void openExternalUrl(url);
      return false;
    },
    [onInterceptInternalPath, onSessionEnded, openExternalUrl],
  );

  const handleOpenWindow = useCallback(
    (event: WebViewOpenWindowEvent) => {
      const targetUrl = event.nativeEvent.targetUrl;

      if (!targetUrl) {
        return;
      }

      if (isInternalSiteUrl(targetUrl)) {
        if (onInterceptInternalPath) {
          try {
            const { pathname } = new URL(targetUrl);
            if (onInterceptInternalPath(pathname)) {
              return;
            }
          } catch {
            // fall through
          }
        }

        const embeddedUrl = ensureEmbedQuery(targetUrl);
        webViewRef.current?.injectJavaScript(
          `window.location.href = ${JSON.stringify(embeddedUrl)}; true;`,
        );
        return;
      }

      void openExternalUrl(targetUrl);
    },
    [onInterceptInternalPath, openExternalUrl],
  );

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleLoadEnd = useCallback(() => {
    applyEmbedHiding();
    setTimeout(() => {
      applyEmbedHiding();
      setIsLoading(false);
    }, 120);
  }, [applyEmbedHiding]);

  const handleNavigationChange = useCallback(
    (navigation: WebViewNavigation) => {
      setShowCloseButton(getComparableUrl(navigation.url) !== rootComparableUrl);

      try {
        const { pathname } = new URL(navigation.url);

        if (pathname === '/api/auth/signout') {
          pendingSignOutRef.current = true;
          return;
        }

        if (pathname === '/login' && onSessionEnded) {
          clearSignOutFallback();
          signOutFallbackTimerRef.current = setTimeout(() => {
            completeSignOut();
          }, 300);
        }
      } catch {
        // ignore malformed URLs
      }
    },
    [clearSignOutFallback, completeSignOut, onSessionEnded, rootComparableUrl],
  );

  const handleClose = useCallback(() => {
    setIsLoading(true);
    setShowCloseButton(false);
    webViewRef.current?.injectJavaScript(
      `window.location.replace(${JSON.stringify(rootUrl)}); true;`,
    );
  }, [rootUrl]);

  return (
    <View style={styles.container}>
      {hasError ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>ページを読み込めませんでした</Text>
          <Text style={styles.errorBody}>通信環境を確認して、もう一度お試しください。</Text>
          <Pressable accessibilityRole="button" onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>再読み込み</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={remountKey ?? path}
          ref={webViewRef}
          source={{ uri: rootUrl }}
          style={styles.webView}
          applicationNameForUserAgent={APP_WEBVIEW_USER_AGENT}
          injectedJavaScriptBeforeContentLoaded={APP_EMBED_HIDING_SCRIPT}
          injectedJavaScript={APP_EMBED_HIDING_SCRIPT}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows
          startInLoadingState
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onOpenWindow={handleOpenWindow}
          onMessage={(event) => {
            const message = event.nativeEvent.data;

            if (message === SITE_SIGN_OUT_REQUEST_MESSAGE) {
              requestWebSignOut();
              return;
            }

            if (message === SITE_SIGN_OUT_MESSAGE) {
              completeSignOut();
            }
          }}
          onError={(event: WebViewErrorEvent) => {
            console.error('WebView load error', event.nativeEvent);
            setHasError(true);
            setIsLoading(false);
          }}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 400) {
              setHasError(true);
              setIsLoading(false);
            }
          }}
        />
      )}

      {showCloseButton && !hasError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="閉じる"
          onPress={handleClose}
          style={[styles.closeButton, { top: insets.top + 8 }]}
        >
          <Ionicons name="close" size={18} color="#ffffff" />
        </Pressable>
      ) : null}

      {isLoading && !hasError ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#BF953F" size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBody: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#BF953F',
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});
