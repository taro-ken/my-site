import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SITE_ORIGIN } from '../config';
import { buildWebSignOutScript, SITE_SIGN_OUT_MESSAGE } from '../lib/siteSession';

type SessionClearWebViewProps = {
  onComplete: () => void;
};

export default function SessionClearWebView({ onComplete }: SessionClearWebViewProps) {
  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script>${buildWebSignOutScript()}</script>
  </body>
</html>`,
    [],
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      <WebView
        source={{ html, baseUrl: SITE_ORIGIN }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        onMessage={(event) => {
          if (event.nativeEvent.data === SITE_SIGN_OUT_MESSAGE) {
            onComplete();
          }
        }}
        onError={onComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    pointerEvents: 'none',
  },
});
