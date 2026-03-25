import { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Dimensions,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_FEED_POSTS, type Post } from '@/data/mockData';
import { SalePostCard } from '@/components/feed/SalePostCard';
import { ISOPostCard } from '@/components/feed/ISOPostCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = 12;
const CARD_V_PADDING = 6;

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [pageHeight, setPageHeight] = useState(0);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} onLayout={handleLayout}>
      {/* Notification Bell */}
      <Pressable
        style={[
          styles.bellBtn,
          {
            top: insets.top + 8,
            backgroundColor: scheme === 'dark' ? 'rgba(28,31,42,0.8)' : 'rgba(255,255,255,0.8)',
          },
        ]}
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
        <View style={styles.bellDot} />
      </Pressable>

      {/* Feed */}
      {pageHeight > 0 && (
        <FlatList
          data={MOCK_FEED_POSTS}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          snapToAlignment="start"
          decelerationRate="fast"
          bounces={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bellBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.primary,
  },
  page: {
    paddingHorizontal: CARD_H_PADDING,
    paddingVertical: CARD_V_PADDING,
  },
});
