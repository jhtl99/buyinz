import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SalePost } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { getFollowers, getFollowing, fetchUserSaleListings } from '@/supabase/queries';
import { BuyinzProSubscribeModal } from '@/components/pro/BuyinzProSubscribeModal';
import { ProfileBody } from '@/components/profile/ProfileBody';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [userListings, setUserListings] = useState<SalePost[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const { isBuyinzPro, listingCount, maxFreeListings, isReady } = useSubscription();
  const [proModalVisible, setProModalVisible] = useState(false);

  const loadListings = useCallback(() => {
    if (!user?.id) {
      setUserListings([]);
      setListingsLoading(false);
      return;
    }
    setListingsLoading(true);
    fetchUserSaleListings(user.id)
      .then(setUserListings)
      .catch((e) => {
        console.error(e);
        setUserListings([]);
      })
      .finally(() => setListingsLoading(false));
  }, [user?.id]);

  const loadConnectionCounts = useCallback(() => {
    if (!user?.id) {
      setFollowersCount(0);
      setFollowingCount(0);
      return Promise.resolve();
    }

    return Promise.all([getFollowers(user.id), getFollowing(user.id)])
      .then(([followers, following]) => {
        setFollowersCount(followers.length);
        setFollowingCount(following.length);
      })
      .catch((e) => {
        console.error(e);
        setFollowersCount(0);
        setFollowingCount(0);
      });
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadConnectionCounts();
      loadListings();
    }, [loadConnectionCounts, loadListings]),
  );

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setUser(null);
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="person-circle-outline" size={80} color={colors.tabIconDefault} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' }}>Sign in to continue</Text>
        <Text style={{ color: colors.tabIconDefault, textAlign: 'center', marginBottom: 24, fontSize: 16 }}>
          Sign in or create a profile to use Buyinz—browse the feed, message sellers, and list items.
        </Text>
        <Pressable
          style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 }}
          onPress={() => router.push('/create-profile')}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sign in / Create profile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.username, { color: colors.text }]}>{user.username}</Text>
        <Pressable hitSlop={8} onPress={handleSignOut} accessibilityLabel="Sign out">
          <Ionicons name="log-out-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ProfileBody
        username={user.username}
        displayName={user.display_name}
        bio={user.bio}
        location={user.location}
        avatarUrl={user.avatar_url}
        showProBadge={isBuyinzPro}
        followersCount={followersCount}
        followingCount={followingCount}
        postsCount={userListings.length}
        userIdForRatings={user.id!}
        listings={userListings}
        listingsLoading={listingsLoading}
        onPressFollowers={() => router.push('/social?tab=followers')}
        onPressFollowing={() => router.push('/social?tab=following')}
        onPressListing={(listingId) =>
          router.push(`/listing/${listingId}`, { withAnchor: true })
        }
        listingsEmptyVariant="self"
        footerBeforeGrid={
          <>
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: scheme === 'light' ? '#EFEFEF' : '#2A2A2A' }]}
                onPress={() => router.push('/edit-profile')}
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
                  {isReady ? `${listingCount} of ${maxFreeListings} free listings used` : 'Loading listing allowance…'}
                </Text>
                <Pressable style={[styles.proCta, { backgroundColor: Brand.primary }]} onPress={() => setProModalVisible(true)}>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.proCtaText}>Subscribe to Buyinz Pro</Text>
                </Pressable>
              </View>
            )}
          </>
        }
      />

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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
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
});
