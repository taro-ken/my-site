import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import {
  FILTER_EXCLUDE_GEARLIST,
  getBlogDetail,
  getBlogs,
  type BlogItem,
} from '../lib/cms';
import { formatBlogDate, isPublicBlogItem } from '../lib/blog';
import { splitBlogContent } from '../lib/paywall';
import { buildSiteUrl } from '../config';
import { APP_PAGE_TOP_PADDING } from '../lib/appPageHeader';
import BlogHtmlContent from '../components/blog/BlogHtmlContent';
import SiteWebView from '../components/SiteWebView';
import type { BlogStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<BlogStackParamList, 'BlogDetail'>;

export default function BlogDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [blog, setBlog] = useState<BlogItem | null>(null);
  const [showWebReader, setShowWebReader] = useState(false);
  const [prevPost, setPrevPost] = useState<BlogItem | null>(null);
  const [nextPost, setNextPost] = useState<BlogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBlog = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const detail = await getBlogDetail(route.params.id);

      if (!isPublicBlogItem(detail)) {
        setErrorMessage('この記事はアプリのブログ一覧には表示されません。');
        setBlog(null);
        return;
      }

      const [prevResponse, nextResponse] = await Promise.all([
        getBlogs({
          filters: `publishedAt[less_than]${detail.publishedAt}[and]${FILTER_EXCLUDE_GEARLIST}`,
          orders: '-publishedAt',
          limit: 5,
        }),
        getBlogs({
          filters: `publishedAt[greater_than]${detail.publishedAt}[and]${FILTER_EXCLUDE_GEARLIST}`,
          orders: 'publishedAt',
          limit: 5,
        }),
      ]);

      setBlog(detail);
      setPrevPost(prevResponse.contents.filter(isPublicBlogItem)[0] ?? null);
      setNextPost(nextResponse.contents.filter(isPublicBlogItem)[0] ?? null);
    } catch (error) {
      console.error('Failed to fetch blog detail', error);
      setErrorMessage('記事を読み込めませんでした。');
      setBlog(null);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    void loadBlog();
  }, [loadBlog]);

  const openMembership = useCallback(async () => {
    const redirect = encodeURIComponent(`/blog/${route.params.id}`);
    await WebBrowser.openBrowserAsync(
      buildSiteUrl(`/membership?redirect=${redirect}`),
    );
  }, [route.params.id]);

  const openLogin = useCallback(async () => {
    const redirect = encodeURIComponent(`/blog/${route.params.id}`);
    await WebBrowser.openBrowserAsync(buildSiteUrl(`/login?redirect=${redirect}`));
  }, [route.params.id]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#BF953F" size="large" />
      </View>
    );
  }

  if (!blog || errorMessage) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{errorMessage ?? '記事が見つかりませんでした。'}</Text>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>一覧へ戻る</Text>
        </Pressable>
      </View>
    );
  }

  const { hasMarker, freePart } = splitBlogContent(blog.content);
  const articlePath = `/blog/${blog.id}`;

  return (
    <View style={[styles.container, { paddingTop: APP_PAGE_TOP_PADDING }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.topBarButton}>
          <Ionicons name="chevron-back" size={22} color="#f4f4f5" />
          <Text style={styles.topBarButtonText}>戻る</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatBlogDate(blog.publishedAt)}</Text>
          <Text style={styles.metaDivider}>|</Text>
          <Text style={styles.metaText}>taro.</Text>
        </View>

        <View style={styles.titleRow}>
          {blog.is_premium ? (
            <Ionicons name="lock-closed" size={24} color="#ffffff" style={styles.titleLockIcon} />
          ) : null}
          <Text style={styles.title}>{blog.title}</Text>
        </View>

        {blog.eyecatch ? (
          <Image source={{ uri: blog.eyecatch.url }} style={styles.eyecatch} />
        ) : null}

        {!blog.is_premium ? (
          <BlogHtmlContent html={blog.content} />
        ) : (
          <>
            {hasMarker ? <BlogHtmlContent html={freePart} /> : null}
            <View style={styles.paywallCard}>
              <Text style={styles.paywallTitle}>会員限定コンテンツです</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowWebReader(true)}
                style={styles.paywallButton}
              >
                <Text style={styles.paywallButtonText}>会員として読む</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void openMembership()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>メンバーに登録する</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void openLogin()}>
                <Text style={styles.loginHint}>
                  すでに登録済みですか？{' '}
                  <Text style={styles.loginLink}>ログインはこちら</Text>
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={styles.postNav}>
          <View style={styles.postNavColumn}>
            {prevPost ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.replace('BlogDetail', { id: prevPost.id })}
              >
                <Text style={styles.postNavLabel}>Previous Post</Text>
                <Text numberOfLines={2} style={styles.postNavTitle}>
                  {prevPost.title}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.postNavDivider} />
          <View style={[styles.postNavColumn, styles.postNavColumnRight]}>
            {nextPost ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.replace('BlogDetail', { id: nextPost.id })}
              >
                <Text style={[styles.postNavLabel, styles.postNavLabelRight]}>Next Post</Text>
                <Text numberOfLines={2} style={[styles.postNavTitle, styles.postNavTitleRight]}>
                  {nextPost.title}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showWebReader}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowWebReader(false)}
      >
        <View style={styles.webReader}>
          <SiteWebView path={articlePath} />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowWebReader(false)}
            style={[styles.webReaderClose, { top: insets.top + 8 }]}
          >
            <Text style={styles.webReaderCloseText}>閉じる</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  topBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  topBarButtonText: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  metaText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  metaDivider: {
    color: '#52525b',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  titleLockIcon: {
    marginTop: 4,
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
  },
  eyecatch: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 4,
    marginBottom: 24,
  },
  paywallCard: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  paywallTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  paywallButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
  },
  paywallButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loginHint: {
    color: '#71717a',
    fontSize: 12,
    textAlign: 'center',
  },
  loginLink: {
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
  webReader: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webReaderClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  webReaderCloseText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  postNav: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    flexDirection: 'row',
    gap: 12,
  },
  postNavColumn: {
    flex: 1,
  },
  postNavColumnRight: {
    alignItems: 'flex-end',
  },
  postNavDivider: {
    width: 1,
    backgroundColor: '#18181b',
  },
  postNavLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  postNavLabelRight: {
    textAlign: 'right',
  },
  postNavTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  postNavTitleRight: {
    textAlign: 'right',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#27272a',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
