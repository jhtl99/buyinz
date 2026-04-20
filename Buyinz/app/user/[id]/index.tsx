import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileBody } from '@/components/profile/ProfileBody';
import { VerticalSalePostFeed } from '@/components/feed/VerticalSalePostFeed';
import {
  fetchNewSaleListingsCountLast24hBatch,
  fetchStoreFollowerCountsBatch,
  fetchStoreSaleListingsLast24h,
  fetchUserPublicProfileById,
  fetchUserSaleListings,
  followStore,
  isFollowingStore,
  storeProfileAddressLine,
  unfollowStore,
} from '@/supabase/queries';
import type { SalePost } from '@/data/mockData';

type ProfileView = 'account' | 'newItems';

export default function PublicUserProfileScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const tabParam = typeof params.tab === 'string' ? params.tab : params.tab?.[0];

  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchUserPublicProfileById>>>(null);
  const [listings, setListings] = useState<SalePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemsLast24h, setNewItemsLast24h] = useState<number | undefined>(undefined);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [view, setView] = useState<ProfileView>('account');
  const [newFeedPosts, setNewFeedPosts] = useState<SalePost[]>([]);
  const [newFeedLoading, setNewFeedLoading] = useState(false);

  const refreshFollowState = useCallback(async () => {
    if (!id) return;
    const counts = await fetchStoreFollowerCountsBatch([id]);
    setFollowerCount(counts[id] ?? 0);
    if (user?.account_type === 'user') {
      setIsFollowing(await isFollowingStore(id));
    } else {
      setIsFollowing(false);
    }
  }, [id, user?.account_type]);

  const load = useCallback(async () => {
    if (!id) return;

    if (user?.id && id === user.id) {
      router.replace('/(tabs)/profile');
      return;
    }

    setLoading(true);
    setError(null);
    setListingsLoading(true);
    try {
      const p = await fetchUserPublicProfileById(id);
      setProfile(p);
      if (!p) {
        setError('User not found');
        setListings([]);
        setNewItemsLast24h(undefined);
        setFollowerCount(0);
      } else {
        const saleListings = await fetchUserSaleListings(id);
        setListings(saleListings);
        if (p.account_type === 'store') {
          const counts = await fetchNewSaleListingsCountLast24hBatch([id]);
          setNewItemsLast24h(counts[id]);
          const fc = await fetchStoreFollowerCountsBatch([id]);
          setFollowerCount(fc[id] ?? 0);
          if (user?.account_type === 'user') {
            setIsFollowing(await isFollowingStore(id));
          } else {
            setIsFollowing(false);
          }
        } else {
          setNewItemsLast24h(undefined);
          setFollowerCount(0);
          setIsFollowing(false);
        }
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Could not load profile');
      setProfile(null);
      setListings([]);
      setNewItemsLast24h(undefined);
    } finally {
      setLoading(false);
      setListingsLoading(false);
    }
  }, [id, user?.id, router, user?.account_type]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (tabParam === 'new') setView('newItems');
  }, [tabParam]);

  useEffect(() => {
    if (!id || profile?.account_type !== 'store' || view !== 'newItems') return;
    let cancelled = false;
    setNewFeedLoading(true);
    fetchStoreSaleListingsLast24h(id)
      .then((data) => {
        if (!cancelled) setNewFeedPosts(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setNewFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, profile?.account_type, view]);

  const showFollowControls =
    user?.account_type === 'user' && profile?.account_type === 'store' && user?.id !== profile?.id;

  const handleFollow = useCallback(async () => {
    if (!id || !showFollowControls) return;
    setFollowBusy(true);
    try {
      await followStore(id);
      setIsFollowing(true);
      await refreshFollowState();
    } catch (e) {
      console.error(e);
      Alert.alert('Could not follow', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setFollowBusy(false);
    }
  }, [id, showFollowControls, refreshFollowState]);

  const runUnfollow = useCallback(async () => {
    if (!id) return;
    setFollowBusy(true);
    try {
      await unfollowStore(id);
      setIsFollowing(false);
      await refreshFollowState();
    } catch (e) {
      console.error(e);
      Alert.alert('Could not unfollow', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setFollowBusy(false);
    }
  }, [id, refreshFollowState]);

  const confirmUnfollow = useCallback(() => {
    Alert.alert('Unfollow this store?', 'You can follow again anytime from their profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unfollow', style: 'destructive', onPress: () => void runUnfollow() },
    ]);
  }, [runUnfollow]);

  if (!id) {
    return null;
  }

  if (loading && !profile && !error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={[styles.backRow, { alignSelf: 'flex-start', marginBottom: 16 }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontWeight: '600', textAlign: 'center' }}>{error ?? 'User not found'}</Text>
        <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: Brand.primary, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const avatarUrl = profile.avatar_url ?? undefined;
  const isStore = profile.account_type === 'store';

  const storeLocationLine = isStore ? storeProfileAddressLine(profile) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        {isStore ? (
          <>
            <View style={styles.headerSegmentWrap}>
              <Pressable
                onPress={() => setView('account')}
                style={[
                  styles.segmentChip,
                  view === 'account'
                    ? { backgroundColor: Brand.primary, borderColor: Brand.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.segmentText, { color: view === 'account' ? '#FFFFFF' : colors.text }]}>
                  Account
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setView('newItems')}
                style={[
                  styles.segmentChip,
                  view === 'newItems'
                    ? { backgroundColor: Brand.primary, borderColor: Brand.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.segmentText, { color: view === 'newItems' ? '#FFFFFF' : colors.text }]}>
                  New Items
                </Text>
              </Pressable>
            </View>
            {showFollowControls ? (
              <Pressable
                style={[
                  styles.headerFollowBtn,
                  {
                    backgroundColor: isFollowing ? colors.card : Brand.primary,
                    borderColor: isFollowing ? colors.border : Brand.primary,
                  },
                ]}
                onPress={isFollowing ? confirmUnfollow : handleFollow}
                disabled={followBusy}
              >
                <Text
                  style={[
                    styles.headerFollowBtnText,
                    { color: isFollowing ? colors.text : '#FFFFFF' },
                  ]}
                >
                  {followBusy ? '…' : isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.headerRightSlot} />
            )}
          </>
        ) : (
          <>
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {profile.username}
            </Text>
            <View style={{ width: 40 }} />
          </>
        )}
      </View>

      {isStore ? (
        <>
          {view === 'account' ? (
            <View style={styles.accountPane}>
              <ProfileBody
                username={profile.username}
                displayName={profile.display_name}
                bio={profile.bio}
                location={storeLocationLine ?? profile.location}
                avatarUrl={avatarUrl}
                postsCount={listings.length}
                followerCount={followerCount}
                listings={listings}
                listingsLoading={listingsLoading}
                onPressListing={(listingId) =>
                  router.push(`/listing/${listingId}`, { withAnchor: true })
                }
                listingsEmptyVariant="other"
                newItemsLast24h={newItemsLast24h}
              />
            </View>
          ) : (
            <View style={styles.newItemsPane}>
              <VerticalSalePostFeed
                posts={newFeedPosts}
                loading={newFeedLoading}
                emptyTitle="No new items yet"
                emptySubtitle="This store has nothing new in the last 24 hours."
                showNewBadgeOnEachCard
              />
            </View>
          )}
        </>
      ) : (
        <ProfileBody
          username={profile.username}
          displayName={profile.display_name}
          bio={profile.bio}
          location={profile.location}
          avatarUrl={avatarUrl}
          postsCount={listings.length}
          listings={listings}
          listingsLoading={listingsLoading}
          onPressListing={(listingId) =>
            router.push(`/listing/${listingId}`, { withAnchor: true })
          }
          listingsEmptyVariant="other"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    padding: 8,
    width: 40,
  },
  headerSegmentWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 0,
  },
  headerRightSlot: {
    width: 88,
  },
  headerFollowBtn: {
    minWidth: 88,
    maxWidth: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFollowBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  username: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backRow: {
    padding: 4,
  },
  segmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  accountPane: {
    flex: 1,
  },
  newItemsPane: {
    flex: 1,
  },
});
