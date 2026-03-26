import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_FEED_POSTS } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { deleteProfile } from '@/lib/supabase';
import { getFollowers, getFollowing, fetchUserRatingStats } from '@/supabase/queries';
import { BuyinzProSubscribeModal } from '@/components/pro/BuyinzProSubscribeModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_ITEM_SIZE = SCREEN_WIDTH / 3;

function Stat({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const content = (
    <View style={styles.statContainer}>
      <Text style={[styles.statValue, { color: colors.text }]}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [receivedRatings, setReceivedRatings] = useState<{
    averageRating: number;
    ratingCount: number;
  } | null>(null);

  const userListings = MOCK_FEED_POSTS.filter(p => p.type === 'sale').slice(0, 6);
  const { isBuyinzPro, listingCount, maxFreeListings, isReady } = useSubscription();
  const [proModalVisible, setProModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setFollowersCount(0);
        setFollowingCount(0);
        setReceivedRatings(null);
        return undefined;
      }

      let cancelled = false;
      setReceivedRatings(null);

      (async () => {
        try {
          const [followers, following, stats] = await Promise.all([
            getFollowers(user.id!),
            getFollowing(user.id!),
            fetchUserRatingStats(user.id!),
          ]);
          if (cancelled) return;
          setFollowersCount(followers.length);
          setFollowingCount(following.length);
          setReceivedRatings(stats ?? { averageRating: 0, ratingCount: 0 });
        } catch (e) {
          console.error(e);
          if (!cancelled) {
            setFollowersCount(0);
            setFollowingCount(0);
            setReceivedRatings({ averageRating: 0, ratingCount: 0 });
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure you want to delete your profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          if (user?.username) {
            await deleteProfile(user.username);
          }
          setUser(null);
      }}
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="person-circle-outline" size={80} color={colors.tabIconDefault} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' }}>No Profile Found</Text>
        <Text style={{ color: colors.tabIconDefault, textAlign: 'center', marginBottom: 24, fontSize: 16 }}>Create an account to establish your identity and build trust with your community.</Text>
        <Pressable 
          style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 }}
          onPress={() => router.push('/create-profile')}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Create Profile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.username, { color: colors.text }]}>{user.username}</Text>
        <Pressable hitSlop={8} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarStatsRow}>
            <Image source={{ uri: user.avatar_url }} style={[styles.avatar, { borderColor: colors.border }]} />
            <View style={styles.statsRow}>
              <Stat label="Posts" value={userListings.length} />
              <Stat label="Followers" value={followersCount} onPress={() => router.push('/social?tab=followers')} />
              <Stat label="Following" value={followingCount} onPress={() => router.push('/social?tab=following')} />
            </View>
          </View>

          <View style={styles.bioSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]}>{user.display_name}</Text>
              {isBuyinzPro && (
                <View style={[styles.proBadge, { backgroundColor: `${Brand.primary}22` }]}>
                  <Ionicons name="sparkles" size={14} color={Brand.primary} />
                  <Text style={[styles.proBadgeText, { color: Brand.primary }]}>Pro</Text>
                </View>
              )}
              {/* Profile is verified once account exists properly */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <Text style={[styles.bio, { color: colors.text }]}>{user.bio}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.tint} />
              <Text style={[styles.location, { color: colors.tabIconDefault }]}>{user.location}</Text>
            </View>

            {/* From `users.average_rating` / `rating_count`, maintained when others insert `user_ratings`. */}
            <View style={[styles.ratingRow, { marginTop: 10 }]}>
              {receivedRatings === null ? (
                <ActivityIndicator size="small" color={Brand.primary} />
              ) : receivedRatings.ratingCount < 1 ? (
                <Text style={[styles.noRatingsText, { color: colors.textSecondary }]}>
                  No Ratings yet
                </Text>
              ) : (
                <>
                  <Ionicons name="star" size={18} color="#F59E0B" />
                  <Text style={[styles.ratingMain, { color: colors.text }]}>
                    {receivedRatings.averageRating.toFixed(1)}
                    <Text style={[styles.ratingOutOf, { color: colors.textSecondary }]}> / 5</Text>
                  </Text>
                  <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                    · {receivedRatings.ratingCount}{' '}
                    {receivedRatings.ratingCount === 1 ? 'rating' : 'ratings'}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.actionButtons}>
            <Pressable 
              style={[styles.actionBtn, { backgroundColor: scheme === 'light' ? '#EFEFEF' : '#2A2A2A' }]}
              onPress={() => router.push('/create-profile')}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: scheme === 'light' ? '#EFEFEF' : '#2A2A2A' }]}
              onPress={() => router.push('/social')}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Connections</Text>
            </Pressable>
          </View>

          {!isBuyinzPro && (
            <View
              style={[
                styles.accountCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.accountCardTitle, { color: colors.text }]}>Account</Text>
              <Text style={[styles.accountCardLine, { color: colors.textSecondary }]}>
                {isReady
                  ? `${listingCount} of ${maxFreeListings} free listings used`
                  : 'Loading listing allowance…'}
              </Text>
              <Pressable
                style={[styles.proCta, { backgroundColor: Brand.primary }]}
                onPress={() => setProModalVisible(true)}
              >
                <Ionicons name="card-outline" size={18} color="#fff" />
                <Text style={styles.proCtaText}>Subscribe to Buyinz Pro</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Grid Header */}
        <View style={[styles.gridHeader, { borderTopColor: colors.border }]}>
          <Ionicons name="grid-outline" size={20} color={colors.text} />
        </View>

        {/* Listings Grid */}
        <View style={styles.gridContainer}>
          {userListings.map((listing, i) => (
            <View key={listing.id} style={[styles.gridItem, { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }]}>
              <Image 
                source={{ uri: listing.type === 'sale' ? listing.images[0] : 'https://via.placeholder.com/150' }} 
                style={styles.gridImage} 
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <BuyinzProSubscribeModal visible={proModalVisible} onClose={() => setProModalVisible(false)} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileSection: {
    padding: 16,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginLeft: 16,
  },
  statContainer: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  bioSection: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    gap: 4,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 13,
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 22,
  },
  noRatingsText: {
    fontSize: 15,
    fontWeight: '500',
  },
  ratingMain: {
    fontSize: 16,
    fontWeight: '800',
  },
  ratingOutOf: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  accountCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  accountCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  accountCardLine: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  proCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  proCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  gridHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
});