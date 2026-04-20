import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';

import { StoreListRow, type StoreListRowModel } from '@/components/stores/StoreListRow';
import { Brand, Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_CMU_COORDS, milesBetween } from '@/lib/discoveryLocation';
import { sortNearbyStoresForExplore, type ExploreSortMode } from '@/lib/exploreSort';
import {
  fetchNearbyStoresForExplore,
  type GeoPoint,
  type NearbyStoreForExplore,
} from '@/supabase/queries';

const RADIUS_OPTIONS: { label: string; miles: number }[] = [
  { label: '5 mi', miles: 5 },
  { label: '10 mi', miles: 10 },
  { label: '20 mi', miles: 20 },
];

const SORT_OPTIONS: { label: string; mode: ExploreSortMode }[] = [
  { label: 'Distance', mode: 'distance' },
  { label: 'New items', mode: 'newItems' },
];

const DEFAULT_RADIUS_MILES = 5;

function nearbyToRowModel(store: NearbyStoreForExplore): StoreListRowModel {
  return {
    id: store.id,
    username: store.username,
    display_name: store.display_name,
    avatar_url: store.avatar_url,
    newItemsLast24h: store.newItemsLast24h,
    previewUrls: store.previewUrls,
    totalSaleListings: store.totalSaleListings,
    distanceMiles: store.distanceMiles,
  };
}

export default function ExploreTabScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isFocused = useIsFocused();

  const [activeRadius, setActiveRadius] = useState(DEFAULT_RADIUS_MILES);
  const [sortMode, setSortMode] = useState<ExploreSortMode>('distance');
  const [userCoords, setUserCoords] = useState<GeoPoint>(DEFAULT_CMU_COORDS);
  const [rawStores, setRawStores] = useState<NearbyStoreForExplore[]>([]);
  const [loading, setLoading] = useState(true);

  const stores = useMemo(
    () => sortNearbyStoresForExplore(rawStores, sortMode),
    [rawStores, sortMode],
  );

  const lastCoordsRef = useRef<GeoPoint>(DEFAULT_CMU_COORDS);

  useEffect(() => {
    if (!user || user.account_type === 'store') return;
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          const nextCoords: GeoPoint = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };

          if (mounted) {
            lastCoordsRef.current = nextCoords;
            setUserCoords(nextCoords);
          }

          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 400,
              timeInterval: 20000,
            },
            (position: Location.LocationObject) => {
              const next: GeoPoint = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };

              const movedMiles = milesBetween(lastCoordsRef.current, next);
              if (movedMiles >= 1) {
                lastCoordsRef.current = next;
                setUserCoords(next);
              }
            },
          );
        } else if (mounted) {
          lastCoordsRef.current = DEFAULT_CMU_COORDS;
          setUserCoords(DEFAULT_CMU_COORDS);
        }
      } catch {
        if (mounted) {
          lastCoordsRef.current = DEFAULT_CMU_COORDS;
          setUserCoords(DEFAULT_CMU_COORDS);
        }
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [user]);

  const loadExplore = useCallback(() => {
    if (!user || user.account_type === 'store') return;
    setLoading(true);
    fetchNearbyStoresForExplore({ userCoords, radiusMiles: activeRadius })
      .then(setRawStores)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, activeRadius, userCoords]);

  useEffect(() => {
    if (!isFocused) return;
    loadExplore();
  }, [isFocused, loadExplore]);

  if (!user) {
    return <Redirect href="/(tabs)/profile" />;
  }

  if (user.account_type === 'store') {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.rounded }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Thrift stores near you
        </Text>

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Distance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {RADIUS_OPTIONS.map((option) => {
            const selected = option.miles === activeRadius;
            return (
              <Pressable
                key={option.label}
                onPress={() => setActiveRadius(option.miles)}
                style={[
                  styles.radiusChip,
                  selected
                    ? { backgroundColor: Brand.primary, borderColor: Brand.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.radiusChipText, { color: selected ? '#FFFFFF' : colors.text }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Sort by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {SORT_OPTIONS.map((option) => {
            const selected = option.mode === sortMode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setSortMode(option.mode)}
                style={[
                  styles.radiusChip,
                  selected
                    ? { backgroundColor: Brand.primary, borderColor: Brand.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.radiusChipText, { color: selected ? '#FFFFFF' : colors.text }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No stores to discover</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            There are no nearby stores you are not already following. Try a wider distance, or check
            back when new stores join. Stores you follow appear on the Home tab.
          </Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <StoreListRow store={nearbyToRowModel(item)} colors={colors} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 20,
  },
  radiusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 14,
  },
});
