import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildSiteUrl, SITE_ORIGIN } from '../config';

type SessionBootstrapWebViewProps = {
  idToken: string;
  onComplete: (path: string) => void;
  onFailure: (message?: string) => void;
};

export default function SessionBootstrapWebView({
  idToken,
  onComplete,
  onFailure,
}: SessionBootstrapWebViewProps) {
  const signinUrl = useMemo(() => buildSiteUrl('/api/auth/signin'), []);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script>
      (async function () {
        const token = ${JSON.stringify(idToken)};
        try {
          const response = await fetch(${JSON.stringify(signinUrl)}, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + token,
            },
            credentials: 'include',
          });

          const data = await response.json().catch(function () {
            return {};
          });

          if (!response.ok) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                ok: false,
                message: data.error || ('HTTP ' + response.status),
              }),
            );
            return;
          }

          window.ReactNativeWebView.postMessage(
            JSON.stringify({ ok: true, url: data.url || '/membership' }),
          );
        } catch (error) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ ok: false, message: 'network_error' }),
          );
        }
      })();
    </script>
  </body>
</html>`,
    [idToken, signinUrl],
  );

  return (
    <View style={styles.container}>
      <WebView
        source={{ html, baseUrl: SITE_ORIGIN }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as {
              ok?: boolean;
              url?: string;
              message?: string;
            };

            if (data.ok && data.url) {
              onComplete(data.url);
              return;
            }

            if (data.message) {
              onFailure(
                data.message === 'network_error'
                  ? '会員ページとの通信に失敗しました。'
                  : `ログイン状態の同期に失敗しました（${data.message}）。`,
              );
              return;
            }
          } catch {
            // fall through
          }

          onFailure();
        }}
      />
      <View style={styles.overlay}>
        <ActivityIndicator color="#BF953F" size="large" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
});
