import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_FEED_POSTS } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { deleteProfile } from '@/lib/supabase';
import { Alert } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_ITEM_SIZE = SCREEN_WIDTH / 3;

function Stat({ label, value }: { label: string; value: number }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  return (
    <View style={styles.statContainer}>
      <Text style={[styles.statValue, { color: colors.text }]}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuth();
  
  const userListings = MOCK_FEED_POSTS.filter(p => p.type === 'sale').slice(0, 6);

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
            <Image source={{ uri: user.avatarUrl }} style={[styles.avatar, { borderColor: colors.border }]} />
            <View style={styles.statsRow}>
              <Stat label="Posts" value={0} />
              <Stat label="Followers" value={0} />
              <Stat label="Following" value={0} />
            </View>
          </View>

          <View style={styles.bioSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: colors.text }]}>{user.display_name}</Text>
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
          </View>

          <View style={styles.actionButtons}>
            <Pressable 
              style={[styles.actionBtn, { backgroundColor: scheme === 'light' ? '#EFEFEF' : '#2A2A2A' }]}
              onPress={() => router.push('/create-profile')}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: scheme === 'light' ? '#EFEFEF' : '#2A2A2A' }]}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Share profile</Text>
            </Pressable>
          </View>
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