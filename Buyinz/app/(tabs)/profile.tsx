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
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SalePost } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  fetchFollowingStoreCount,
  fetchNewSaleListingsCountLast24hBatch,
  fetchStoreFollowerCountsBatch,
  fetchUserPublicProfileById,
  fetchUserSaleListings,
  storeProfileAddressLine,
} from '@/supabase/queries';
import { ProfileBody } from '@/components/profile/ProfileBody';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();

  const [userListings, setUserListings] = useState<SalePost[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [newItemsLast24h, setNewItemsLast24h] = useState<number | undefined>(undefined);
  const [followerCount, setFollowerCount] = useState<number | undefined>(undefined);
  const [followingCount, setFollowingCount] = useState(0);
  const [storeAddressLine, setStoreAddressLine] = useState<string | null>(null);

  const loadListings = useCallback(() => {
    if (!user?.id || user.account_type === 'user') {
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
  }, [user?.id, user?.account_type]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setUserListings([]);
        setListingsLoading(false);
        setNewItemsLast24h(undefined);
        setFollowerCount(undefined);
        setFollowingCount(0);
        setStoreAddressLine(null);
        return;
      }

      if (user.account_type === 'user') {
        setUserListings([]);
        setListingsLoading(false);
        setNewItemsLast24h(undefined);
        setFollowerCount(undefined);
        setStoreAddressLine(null);
        let cancelled = false;
        fetchFollowingStoreCount()
          .then((n) => {
            if (!cancelled) setFollowingCount(n);
          })
          .catch(console.error);
        return () => {
          cancelled = true;
        };
      }

      loadListings();
      let cancelled = false;
      fetchUserPublicProfileById(user.id)
        .then((p) => {
          if (!cancelled && p) setStoreAddressLine(storeProfileAddressLine(p));
        })
        .catch(console.error);
      fetchNewSaleListingsCountLast24hBatch([user.id])
        .then((m) => {
          if (!cancelled) setNewItemsLast24h(m[user.id!]);
        })
        .catch(console.error);
      fetchStoreFollowerCountsBatch([user.id])
        .then((c) => {
          if (!cancelled) setFollowerCount(c[user.id!] ?? 0);
        })
        .catch(console.error);
      return () => {
        cancelled = true;
      };
    }, [loadListings, user?.id, user?.account_type]),
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
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center', fontFamily: Fonts.serif }}>Sign in to continue</Text>
        <Text style={{ color: colors.tabIconDefault, textAlign: 'center', marginBottom: 24, fontSize: 16, fontFamily: Fonts.sans }}>
          Sign in or create a profile to use Buyinz—browse the feed and list items.
        </Text>
        <Pressable
          style={{ backgroundColor: colors.tint, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 }}
          onPress={() => router.push('/create-profile')}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, fontFamily: Fonts.sans }}>Sign in / Create profile</Text>
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
        location={user.account_type === 'store' ? storeAddressLine ?? user.location : user.location}
        avatarUrl={user.avatar_url}
        postsCount={userListings.length}
        followerCount={user.account_type === 'store' ? followerCount : undefined}
        showFollowingStatOnly={user.account_type === 'user'}
        followingCount={user.account_type === 'user' ? followingCount : undefined}
        hideListingsSection={user.account_type === 'user'}
        listings={userListings}
        listingsLoading={listingsLoading}
        onPressListing={(listingId) =>
          router.push(`/listing/${listingId}`, { withAnchor: true })
        }
        listingsEmptyVariant="self"
        newItemsLast24h={user.account_type === 'store' ? newItemsLast24h : undefined}
        footerBeforeGrid={
          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
          </View>
        }
      />
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
    fontFamily: Fonts.serif,
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
    borderWidth: 1,
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
});
