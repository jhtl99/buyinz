import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/data/mockData';
import { fetchFeedPosts } from '@/supabase/queries';
import { SalePostCard } from '@/components/feed/SalePostCard';
import { ISOPostCard } from '@/components/feed/ISOPostCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = 12;
const CARD_V_PADDING = 6;

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [pageHeight, setPageHeight] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const feedRequestId = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    const id = ++feedRequestId.current;
    setLoading(true);
    fetchFeedPosts()
      .then((data) => {
        if (feedRequestId.current === id) setPosts(data);
      })
      .catch(console.error)
      .finally(() => {
        if (feedRequestId.current === id) setLoading(false);
      });
  }, [user]);

  const cardWidth = SCREEN_WIDTH - CARD_H_PADDING * 2;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setPageHeight(e.nativeEvent.layout.height);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      if (pageHeight === 0) return null;

      const isSale = item.type === 'sale';

      return (
        <View
          style={[
            styles.page,
            {
              height: pageHeight,
              justifyContent: isSale ? undefined : 'center',
            },
          ]}
        >
          {isSale ? (
            <SalePostCard post={item} cardWidth={cardWidth} fill />
          ) : (
            <ISOPostCard post={item} />
          )}
        </View>
      );
    },
    [pageHeight, cardWidth],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );

  if (!user) {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Buyinz</Text>
      </View>

      <View style={styles.feedShell} onLayout={handleLayout}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Brand.primary} />
          </View>
        ) : !posts.length && pageHeight > 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
              Be the first to post a listing.
            </Text>
          </View>
        ) : pageHeight > 0 ? (
          <FlatList
            data={posts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            snapToAlignment="start"
            decelerationRate="fast"
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  feedShell: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  page: {
    paddingHorizontal: CARD_H_PADDING,
    paddingVertical: CARD_V_PADDING,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
