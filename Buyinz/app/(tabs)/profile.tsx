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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SalePost } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchUserSaleListings } from '@/supabase/queries';
import { ProfileBody } from '@/components/profile/ProfileBody';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();

  const [userListings, setUserListings] = useState<SalePost[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

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

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings]),
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
          Sign in or create a profile to use Buyinz—browse the feed and list items.
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
        postsCount={userListings.length}
        userIdForRatings={user.id!}
        listings={userListings}
        listingsLoading={listingsLoading}
        onPressListing={(listingId) =>
          router.push(`/listing/${listingId}`, { withAnchor: true })
        }
        listingsEmptyVariant="self"
        footerBeforeGrid={
          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: scheme === 'light' ? '#EFEFEF' : '#2A2A2A' }]}
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
});
