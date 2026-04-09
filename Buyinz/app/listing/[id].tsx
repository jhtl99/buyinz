import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Brand, ConditionColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { OfferModal } from '@/components/offers/OfferModal';
import { getOrCreateConversation, sendMessage, fetchSaleListingById } from '@/supabase/queries';
import { ListingBoostModal } from '@/components/pro/ListingBoostModal';
import { isBoostActive, formatBoostCountdownHHMM } from '@/lib/boost';
import { MOCK_FEED_POSTS, SalePost } from '@/data/mockData';
import { openUserProfile } from '@/lib/openUserProfile';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuth();

  const [post, setPost] = useState<SalePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [boostModalVisible, setBoostModalVisible] = useState(false);
  const [countdownLabel, setCountdownLabel] = useState('00:00');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const fromDb = await fetchSaleListingById(id);
      if (fromDb) {
        setPost(fromDb);
        return;
      }
      const found = MOCK_FEED_POSTS.find((p) => p.id === id && p.type === 'sale') as SalePost | undefined;
      setPost(found ?? null);
    } catch (e) {
      console.error('[listing detail] fetchSaleListingById failed', e);
      setPost(null);
      setLoadError(
        e instanceof Error ? e.message : 'Could not load this listing. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadPost();
    }, [loadPost]),
  );

  useEffect(() => {
    if (!post?.boostedUntil || !isBoostActive(post.boostedUntil)) {
      setCountdownLabel('00:00');
      return;
    }
    const update = () => setCountdownLabel(formatBoostCountdownHHMM(post.boostedUntil));
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [post?.boostedUntil]);

  const handleMakeOffer = async (amount: number) => {
    if (!user || !user.id) {
      Alert.alert('Not Signed In', 'Please sign in to make an offer.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/create-profile') },
      ]);
      throw new Error('Not Signed In');
    }

    if (!post) return;

    const convoId = await getOrCreateConversation(post.id, user.id, post.seller.id);
    const listedLabel = post.price > 0 ? `$${post.price}` : 'Offer';
    const offerMessage = `Offer: $${amount} for "${post.title}" (listed at ${listedLabel})`;

    await sendMessage(convoId, user.id, offerMessage);

    Alert.alert('Offer Sent!', `You offered $${amount}. The seller will be notified.`);
  };

  const isOwner = user?.id === post?.seller.id;
  const showBoostCta = isOwner && post && !post.sold && !isBoostActive(post.boostedUntil);
  const showBoostedRow = post && !post.sold && isBoostActive(post.boostedUntil);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        {loadError ? (
          <>
            <Text style={{ color: colors.text, textAlign: 'center', marginBottom: 12, fontWeight: '600' }}>
              {"Couldn't load listing"}
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              {loadError}
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: Brand.primary }]}
              onPress={() => void loadPost()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: colors.text }}>Listing not found</Text>
        )}
      </View>
    );
  }

  const condColors = ConditionColors[post.condition];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <ScrollView horizontal pagingEnabled style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}>
          {post.images.length > 0 ? (
            post.images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                contentFit="cover"
              />
            ))
          ) : (
            <View
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_WIDTH,
                backgroundColor: colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
            </View>
          )}
        </ScrollView>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
            <Text style={[styles.price, { color: Brand.primary }]}>${post.price}</Text>
          </View>

          <View
            style={[
              styles.conditionBadge,
              { backgroundColor: condColors.bg, borderColor: condColors.border, alignSelf: 'flex-start' },
            ]}
          >
            <Text style={[styles.conditionText, { color: condColors.text }]}>{post.condition}</Text>
          </View>

          {showBoostedRow && (
            <View style={styles.boostRow}>
              <View style={[styles.boostedBadge, { backgroundColor: `${Brand.primary}22` }]}>
                <Ionicons name="rocket-outline" size={14} color={Brand.primary} />
                <Text style={[styles.boostedBadgeText, { color: Brand.primary }]}>Boosted</Text>
              </View>
              {isOwner && (
                <Text style={[styles.countdown, { color: colors.textSecondary }]}>{countdownLabel}</Text>
              )}
            </View>
          )}

          {showBoostCta && (
            <Pressable
              style={[styles.boostCta, { backgroundColor: Brand.primary }]}
              onPress={() => setBoostModalVisible(true)}
            >
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={styles.boostCtaText}>Boost for $1.99 · 24 hours</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.sellerRow, { borderBottomColor: colors.border, borderTopColor: colors.border }]}
            onPress={() => openUserProfile(router, post.seller.id, user?.id)}
          >
            <Image source={{ uri: post.seller.avatar }} style={[styles.avatar, { borderColor: colors.border }]} />
            <View style={styles.sellerInfo}>
              <Text style={[styles.sellerName, { color: colors.text }]}>{post.seller.displayName}</Text>
              <Text style={[styles.sellerMeta, { color: colors.textSecondary }]}>@{post.seller.username}</Text>
            </View>
          </Pressable>

          <Text style={[styles.description, { color: colors.text }]}>{post.description}</Text>
        </View>
      </ScrollView>

      {!isOwner && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.bottomButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
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
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Message</Text>
          </Pressable>

          <Pressable
            style={[styles.bottomButton, { backgroundColor: Brand.primary }]}
            onPress={() => setOfferModalVisible(true)}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Make Offer</Text>
          </Pressable>
        </View>
      )}

      <OfferModal
        visible={offerModalVisible}
        onClose={() => setOfferModalVisible(false)}
        onSubmit={handleMakeOffer}
        originalPrice={post.price}
      />

      <ListingBoostModal
        visible={boostModalVisible}
        onClose={() => setBoostModalVisible(false)}
        listingId={post.id}
        listingTitle={post.title}
        onBoostSuccess={() => {
          void loadPost();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  boostedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  boostedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countdown: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  boostCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  boostCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sellerMeta: {
    fontSize: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 12,
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
