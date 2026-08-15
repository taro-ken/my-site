import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FILTER_EXCLUDE_GEARLIST,
  getAllBlogs,
  getCategories,
  mergeBlogFilters,
  type BlogItem,
  type Category,
} from '../lib/cms';
import { formatBlogDate, getEyecatchUrl, isPublicBlogItem } from '../lib/blog';
import { stripHtml } from '../lib/paywall';
import { isMicroCmsConfigured } from '../lib/env';
import { APP_PAGE_TOP_PADDING } from '../lib/appPageHeader';
import type { BlogStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<BlogStackParamList, 'BlogList'>;

const LIST_HORIZONTAL_PADDING = 24;
const COLUMN_GAP = 12;

export default function BlogListScreen({ navigation }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const gridWidth = windowWidth - LIST_HORIZONTAL_PADDING;
  const cardWidth = (gridWidth - COLUMN_GAP) / 2;
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const blogRows = useMemo(() => {
    const rows: BlogItem[][] = [];

    for (let index = 0; index < blogs.length; index += 2) {
      rows.push(blogs.slice(index, index + 2));
    }

    return rows;
  }, [blogs]);

  const loadBlogs = useCallback(async (categoryId: string | null) => {
    if (!isMicroCmsConfigured()) {
      setErrorMessage('microCMS の設定がありません。NativeApp/.env を確認してください。');
      setBlogs([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const listFilters = mergeBlogFilters(
        categoryId ? `category[equals]${categoryId}` : undefined,
        FILTER_EXCLUDE_GEARLIST,
      );

      const [blogsResponse, categoriesResponse] = await Promise.all([
        getAllBlogs(listFilters ? { filters: listFilters } : undefined),
        getCategories(),
      ]);

      setBlogs(blogsResponse.contents.filter(isPublicBlogItem));
      setCategories(categoriesResponse.contents);
    } catch (error) {
      console.error('Failed to fetch blogs', error);
      setErrorMessage('記事を取得できませんでした。設定と通信環境を確認してください。');
      setBlogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlogs(selectedCategoryId);
  }, [loadBlogs, selectedCategoryId]);

  const renderBlogCard = (item: BlogItem, cardLayoutWidth: number) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate('BlogDetail', { id: item.id })}
      style={[styles.card, { width: cardLayoutWidth }]}
    >
      <View style={[styles.thumbnail, { width: cardLayoutWidth }]}>
        {item.eyecatch ? (
          <Image
            source={{ uri: getEyecatchUrl(item.eyecatch.url) }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderText}>No Image</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          {item.is_premium ? (
            <Ionicons name="lock-closed" size={14} color="#ffffff" style={styles.cardLockIcon} />
          ) : null}
          <Text numberOfLines={3} style={styles.cardTitle}>
            {item.title}
          </Text>
        </View>
        <Text numberOfLines={2} style={styles.cardExcerpt}>
          {stripHtml(item.content)}
        </Text>
        <Text style={styles.readMore}>Read Full Post</Text>
        <Text style={styles.cardMeta}>
          taro. • {formatBlogDate(item.publishedAt)}
        </Text>
      </View>
    </Pressable>
  );

  const renderBlogRow = ({ item: row }: { item: BlogItem[] }) => {
    if (!row?.length) {
      return null;
    }

    return (
      <View style={[styles.row, { width: gridWidth }]}>
        {row.map((blog) => (
          <View key={blog.id}>
            {renderBlogCard(blog, row.length === 1 ? gridWidth : cardWidth)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: APP_PAGE_TOP_PADDING }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelectedCategoryId(null)}
          style={[styles.filterChip, selectedCategoryId === null && styles.filterChipActive]}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedCategoryId === null && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        {categories.map((category) => {
          const isActive = selectedCategoryId === category.id;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              onPress={() => setSelectedCategoryId(category.id)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#BF953F" size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : blogs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>記事がありません</Text>
        </View>
      ) : (
        <FlatList
          data={blogRows}
          keyExtractor={(row, index) =>
            row?.map((blog) => blog.id).join('-') ?? `blog-row-${index}`
          }
          renderItem={renderBlogRow}
          extraData={{ cardWidth, gridWidth }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  filterScroll: {
    flexGrow: 0,
    minHeight: 44,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterChipText: {
    color: '#71717a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: '#000000',
  },
  listContent: {
    paddingHorizontal: LIST_HORIZONTAL_PADDING / 2,
    paddingBottom: 24,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flexShrink: 0,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    marginBottom: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    color: '#52525b',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardBody: {
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardLockIcon: {
    marginTop: 2,
  },
  cardTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  cardExcerpt: {
    color: '#a1a1aa',
    fontSize: 10,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  readMore: {
    color: '#e4e4e7',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textDecorationLine: 'underline',
  },
  cardMeta: {
    color: '#71717a',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  messageBox: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(113, 63, 18, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(161, 98, 7, 0.5)',
  },
  errorText: {
    color: '#fef08a',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '500',
  },
});
