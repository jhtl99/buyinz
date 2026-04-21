import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { StoreListRow, type StoreListRowModel } from '@/components/stores/StoreListRow';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_CMU_COORDS, milesBetween, type GeoPoint } from '@/lib/discoveryLocation';
import { fetchFollowedStoresForHome, type FollowedStoreForHome } from '@/supabase/queries';

function storeToRowModel(store: FollowedStoreForHome, userCoords: GeoPoint | null): StoreListRowModel {
  let distanceMiles: number | null | undefined;
  if (
    userCoords &&
    store.latitude != null &&
    store.longitude != null &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude)
  ) {
    distanceMiles = milesBetween(userCoords, {
      latitude: store.latitude,
      longitude: store.longitude,
    });
  }
  return {
    id: store.id,
    username: store.username,
    display_name: store.display_name,
    avatar_url: store.avatar_url,
    newItemsLast24h: store.newItemsLast24h,
    previewUrls: store.previewUrls,
    totalSaleListings: store.totalSaleListings,
    distanceMiles,
  };
}

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [stores, setStores] = useState<FollowedStoreForHome[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<GeoPoint | null>(null);
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
          setUserCoords(null);
        }
      } catch {
        if (mounted) {
          lastCoordsRef.current = DEFAULT_CMU_COORDS;
          setUserCoords(null);
        }
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [user]);

  const load = useCallback(() => {
    if (!user?.id || user.account_type === 'store') return;
    setLoading(true);
    fetchFollowedStoresForHome()
      .then(setStores)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id, user?.account_type]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Following</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={56} color={colors.tabIconDefault} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>You’re not following any stores yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
            Discover local thrift stores on Explore, open a profile, and tap Follow to see them here.
          </Text>
          <Pressable
            style={[styles.cta, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.ctaText}>Go to Explore</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <StoreListRow store={storeToRowModel(item, userCoords)} colors={colors} />
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Fonts.serif,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 14,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  subtitle: {
    fontFamily: Fonts.sans,
  },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
});
