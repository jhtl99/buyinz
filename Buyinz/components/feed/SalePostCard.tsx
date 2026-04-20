import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import type { SalePost } from '@/data/mockData';
import { openUserProfile } from '@/lib/openUserProfile';
import { NewItemsTodayBadge } from '@/components/NewItemsTodayBadge';

interface Props {
  post: SalePost;
  cardWidth: number;
  fill?: boolean;
  /** Store-only: new sale listings in the last 24h (badge hidden if 0 or omitted). */
  newItemsLast24h?: number;
}

export function SalePostCard({ post, cardWidth, fill, newItemsLast24h }: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuth();

  const [imgIndex, setImgIndex] = useState(0);
  const [imgAreaHeight, setImgAreaHeight] = useState(300);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / cardWidth);
      setImgIndex(idx);
    },
    [cardWidth],
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        fill && { flex: 1 },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => openUserProfile(router, post.seller.id, user?.id)}
          style={styles.headerSellerPressable}
          hitSlop={4}
        >
          <Image
            source={{ uri: post.seller.avatar }}
            style={[styles.avatar, { borderColor: colors.border, backgroundColor: colors.muted }]}
          />
          <View style={styles.headerText}>
            <Text style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>
              {post.seller.displayName}
            </Text>
            <Text style={[styles.sellerMeta, { color: colors.textSecondary }]}>
              @{post.seller.username} · {post.createdAt}
            </Text>
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          {post.seller.accountType === 'store' &&
            newItemsLast24h != null &&
            newItemsLast24h > 0 && (
              <NewItemsTodayBadge count={newItemsLast24h} variant="feedNew" compact />
            )}
        </View>
      </View>

      <View style={styles.listingBody}>
        <View
          style={[styles.imageArea, { backgroundColor: colors.muted }]}
          onLayout={(e) => setImgAreaHeight(e.nativeEvent.layout.height)}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
          >
            {post.images.map((uri, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(`/listing/${post.id}`, { withAnchor: true })}
              >
                <Image
                  source={{ uri }}
                  style={{ width: cardWidth, height: imgAreaHeight }}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            ))}
          </ScrollView>

          {post.images.length > 1 && (
            <View style={styles.dotsRow}>
              {post.images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === imgIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={styles.footerListingPressable}
            onPress={() => router.push(`/listing/${post.id}`, { withAnchor: true })}
          >
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {post.title}
            </Text>
            {post.price != null ? (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>${post.price}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerSellerPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  listingBody: {
    flex: 1,
    minHeight: 200,
    flexDirection: 'column',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  sellerMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  imageArea: {
    flex: 1,
    minHeight: 200,
    overflow: 'hidden',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ scale: 1.3 }],
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footerListingPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  priceBadge: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
