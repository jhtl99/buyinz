import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileBody } from '@/components/profile/ProfileBody';
import {
  fetchUserPublicProfileById,
  fetchUserSaleListings,
  getFollowers,
  getFollowing,
} from '@/supabase/queries';
import type { SalePost } from '@/data/mockData';
import { openUserProfile } from '@/lib/openUserProfile';

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchUserPublicProfileById>>>(null);
  const [listings, setListings] = useState<SalePost[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [p, fl, fg] = await Promise.all([
        fetchUserPublicProfileById(id),
        getFollowers(id),
        getFollowing(id),
      ]);
      setProfile(p);
      setFollowersCount(fl.length);
      setFollowingCount(fg.length);
      if (!p) {
        setError('User not found');
        setListings([]);
      } else {
        const saleListings = await fetchUserSaleListings(id);
        setListings(saleListings);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Could not load profile');
      setProfile(null);
      setListings([]);
    } finally {
      setLoading(false);
      setListingsLoading(false);
    }
  }, [id, user?.id, router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
          {profile.username}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ProfileBody
        username={profile.username}
        displayName={profile.display_name}
        bio={profile.bio}
        location={profile.location}
        avatarUrl={avatarUrl}
        showProBadge={profile.buyinz_pro}
        followersCount={followersCount}
        followingCount={followingCount}
        postsCount={listings.length}
        userIdForRatings={profile.id}
        listings={listings}
        listingsLoading={listingsLoading}
        onPressFollowers={() => router.push(`/user/${id}/followers`)}
        onPressFollowing={() => router.push(`/user/${id}/following`)}
        onPressListing={(listingId) =>
          router.push(`/listing/${listingId}`, { withAnchor: true })
        }
        listingsEmptyVariant="other"
      />
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    width: 40,
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
});
