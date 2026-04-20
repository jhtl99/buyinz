import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';

import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SalePost } from '@/data/mockData';
import { SalePostCard } from '@/components/feed/SalePostCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = 12;
const CARD_V_PADDING = 6;

type Props = {
  posts: SalePost[];
  loading: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  /** Show the compact "New" badge on each card (e.g. 24h new-items feed). */
  showNewBadgeOnEachCard?: boolean;
};

export function VerticalSalePostFeed({
  posts,
  loading,
  emptyTitle = 'No new items',
  emptySubtitle = 'Nothing posted in the last 24 hours.',
  showNewBadgeOnEachCard,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [pageHeight, setPageHeight] = useState(0);

  const cardWidth = SCREEN_WIDTH - CARD_H_PADDING * 2;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setPageHeight(e.nativeEvent.layout.height);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SalePost }) => {
      if (pageHeight === 0) return null;
      return (
        <View style={[styles.page, { height: pageHeight }]}>
          <SalePostCard
            post={item}
            cardWidth={cardWidth}
            fill
            newItemsLast24h={showNewBadgeOnEachCard ? 1 : undefined}
          />
        </View>
      );
    },
    [pageHeight, cardWidth, showNewBadgeOnEachCard],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.feedShell, { backgroundColor: colors.background }]} onLayout={handleLayout}>
      {!posts.length && pageHeight > 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>{emptySubtitle}</Text>
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
  );
}

const styles = StyleSheet.create({
  feedShell: {
    flex: 1,
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
});
