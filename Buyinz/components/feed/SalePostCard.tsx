import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, ConditionColors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import type { SalePost } from '@/data/mockData';
import { isBoostActive, formatBoostCountdownHHMM } from '@/lib/boost';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = 12;

interface Props {
  post: SalePost;
  cardWidth: number;
  fill?: boolean;
}

export function SalePostCard({ post, cardWidth, fill }: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const condColors = ConditionColors[post.condition];
  const { user } = useAuth();
  const isOwnListing = user?.id === post.seller.id;

  const [imgIndex, setImgIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [imgAreaHeight, setImgAreaHeight] = useState(300);
  const [boostCountdown, setBoostCountdown] = useState('');

  useEffect(() => {
    if (!isBoostActive(post.boostedUntil)) {
      setBoostCountdown('');
      return;
    }
    const tick = () => setBoostCountdown(formatBoostCountdownHHMM(post.boostedUntil));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [post.boostedUntil, post.id]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / cardWidth);
      setImgIndex(idx);
    },
    [cardWidth],
  );

  return (
    <Pressable
      onPress={() => router.push(`/listing/${post.id}`)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        fill && { flex: 1 },
      ]}
    >
      {/* Seller Header */}
      <View style={styles.header}>
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
        <View
          style={[
            styles.conditionBadge,
            { backgroundColor: condColors.bg, borderColor: condColors.border },
          ]}
        >
          <Text style={[styles.conditionText, { color: condColors.text }]}>
            {post.condition}
          </Text>
        </View>
      </View>

      {/* Image Carousel */}
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
            <Image
              key={i}
              source={{ uri }}
              style={{ width: cardWidth, height: imgAreaHeight }}
              contentFit="cover"
              transition={200}
            />
          ))}
        </ScrollView>

        {isBoostActive(post.boostedUntil) && (
          <View style={styles.boostOverlay} pointerEvents="none">
            <View style={styles.boostedPill}>
              <Ionicons name="rocket-outline" size={12} color="#fff" />
              <Text style={styles.boostedPillText}>Boosted</Text>
            </View>
            {isOwnListing && <Text style={styles.boostTimer}>{boostCountdown}</Text>}
          </View>
        )}

        {/* Dot indicators */}
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

      {/* Footer: bookmark + message + title | price */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Pressable
            onPress={() => setSaved((s) => !s)}
            hitSlop={8}
            style={styles.bookmarkBtn}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={saved ? Brand.primary : colors.textSecondary}
            />
          </Pressable>
          {!isOwnListing && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: {
                    id: post.id,
                    sellerId: post.seller.id,
                    sellerUsername: post.seller.username,
                    peerUsername: post.seller.username,
                    listingTitle: post.title,
                    listingPrice: String(post.price),
                    listingImage: post.images[0] ?? '',
                  },
                })
              }
              hitSlop={8}
              style={styles.bookmarkBtn}
            >
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          )}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {post.title}
          </Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>
            {post.price === 0 ? 'Offer' : `$${post.price}`}
          </Text>
        </View>
      </View>
    </Pressable>
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
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  imageArea: {
    flex: 1,
    minHeight: 200,
    overflow: 'hidden',
  },
  boostOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boostedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  boostedPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  boostTimer: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  bookmarkBtn: {
    padding: 2,
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
