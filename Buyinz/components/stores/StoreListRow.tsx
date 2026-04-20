import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { NewItemsTodayBadge } from '@/components/NewItemsTodayBadge';
import { Colors } from '@/constants/theme';

export type StoreListRowModel = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  newItemsLast24h: number;
  previewUrls: string[];
  totalSaleListings: number;
  /** When set, shown top-right (e.g. miles from user). */
  distanceMiles?: number | null;
};

type Props = {
  store: StoreListRowModel;
  colors: typeof Colors.light;
};

const THUMB = 44;
const THUMB_GAP = 6;

export function StoreListRow({ store, colors }: Props) {
  const router = useRouter();
  const avatarUri =
    store.avatar_url?.trim() ||
    `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(store.username)}`;

  const showDistance = typeof store.distanceMiles === 'number' && Number.isFinite(store.distanceMiles);
  const showOverflowDots = store.totalSaleListings > 3;

  return (
    <Pressable
      onPress={() => router.push(`/user/${store.id}`)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Image source={{ uri: avatarUri }} style={styles.storeAvatar} contentFit="cover" />
      <View style={styles.mainCol}>
        <View style={styles.titleRow}>
          <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={2}>
            {store.display_name}
          </Text>
          {showDistance ? (
            <Text style={[styles.distance, { color: colors.textSecondary }]}>
              {store.distanceMiles!.toFixed(1)} mi
            </Text>
          ) : (
            <View style={styles.distancePlaceholder} />
          )}
        </View>
        <Text style={[styles.storeUsername, { color: colors.textSecondary }]} numberOfLines={1}>
          @{store.username}
        </Text>
        {store.newItemsLast24h > 0 ? (
          <NewItemsTodayBadge count={store.newItemsLast24h} variant="countToday" />
        ) : null}
        {(store.previewUrls.length > 0 || showOverflowDots) && (
          <View style={styles.thumbRow}>
            {store.previewUrls.slice(0, 3).map((uri, i) => (
              <Image
                key={`${store.id}-p-${i}`}
                source={{ uri }}
                style={[styles.thumb, { backgroundColor: colors.muted }]}
                contentFit="cover"
              />
            ))}
            {showOverflowDots ? (
              <Text style={[styles.moreDots, { color: colors.textSecondary }]}>…</Text>
            ) : null}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  storeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  storeName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  distance: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  distancePlaceholder: {
    width: 44,
  },
  storeUsername: {
    fontSize: 12,
    fontWeight: '600',
  },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THUMB_GAP,
    marginTop: 2,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
  },
  moreDots: {
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 2,
  },
});
