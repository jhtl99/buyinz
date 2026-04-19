import { useMemo, type ReactNode } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SalePost } from '@/data/mockData';
import { ProfileReceivedRatingsRow } from '@/components/profile/ProfileReceivedRatingsRow';

const SCREEN_WIDTH = Dimensions.get('window').width;
export const PROFILE_GRID_ITEM_SIZE = SCREEN_WIDTH / 3;

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

export type ProfileBodyProps = {
  username: string;
  displayName: string;
  bio?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  postsCount: number;
  userIdForRatings: string;
  listings: SalePost[];
  listingsLoading: boolean;
  onPressListing: (listingId: string) => void;
  /** Shown between ratings row and grid (e.g. Edit profile button). */
  footerBeforeGrid?: ReactNode;
  /** Copy for empty listings state */
  listingsEmptyVariant: 'self' | 'other';
};

export function ProfileBody({
  username: _username,
  displayName,
  bio,
  location,
  avatarUrl,
  postsCount,
  userIdForRatings,
  listings,
  listingsLoading,
  onPressListing,
  footerBeforeGrid,
  listingsEmptyVariant,
}: ProfileBodyProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const paddedGridItems = useMemo(() => {
    const items: (SalePost | null)[] = [...listings];
    const remainder = items.length % 3;
    if (remainder !== 0) {
      for (let i = 0; i < 3 - remainder; i++) items.push(null);
    }
    return items;
  }, [listings]);

  const uri =
    avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(_username)}`;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.profileSection}>
        <View style={styles.avatarStatsRow}>
          <Image source={{ uri }} style={[styles.avatar, { borderColor: colors.border }]} />
          <View style={styles.statsRow}>
            <Stat label="Posts" value={postsCount} />
          </View>
        </View>

        <View style={styles.bioSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          {!!bio && <Text style={[styles.bio, { color: colors.text }]}>{bio}</Text>}
          {!!location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.tint} />
              <Text style={[styles.location, { color: colors.tabIconDefault }]}>{location}</Text>
            </View>
          )}

          <ProfileReceivedRatingsRow userId={userIdForRatings} />
        </View>

        {footerBeforeGrid}
      </View>

      <View style={[styles.gridHeader, { borderTopColor: colors.border }]}>
        <Ionicons name="grid-outline" size={20} color={colors.text} />
      </View>

      {listingsLoading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <Text style={{ color: colors.tabIconDefault }}>Loading listings…</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={{ paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' }}>
          <Ionicons name="images-outline" size={40} color={colors.tabIconDefault} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>No listings yet</Text>
          <Text style={{ color: colors.tabIconDefault, textAlign: 'center', fontSize: 14 }}>
            {listingsEmptyVariant === 'self'
              ? 'When you post items for sale, they will show here in a grid.'
              : 'This user has not posted any listings yet.'}
          </Text>
        </View>
      ) : (
        <View style={styles.gridContainer}>
          {paddedGridItems.map((listing, i) => (
            <View
              key={listing ? listing.id : `grid-pad-${i}`}
              style={[styles.gridItem, { width: PROFILE_GRID_ITEM_SIZE, height: PROFILE_GRID_ITEM_SIZE }]}
            >
              {listing ? (
                <Pressable style={{ flex: 1 }} onPress={() => onPressListing(listing.id)}>
                  <Image
                    source={{
                      uri: listing.images[0] ?? 'https://via.placeholder.com/150',
                    }}
                    style={styles.gridImage}
                  />
                </Pressable>
              ) : (
                <View style={[styles.gridImage, { backgroundColor: colors.muted }]} />
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    flexWrap: 'wrap',
    gap: 6,
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
    marginTop: 4,
  },
  location: {
    fontSize: 13,
    marginLeft: 4,
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
