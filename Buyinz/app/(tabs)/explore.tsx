import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_PITTSBURGH_COORDS,
  fetchDiscoveryFeed,
  type DiscoverySalePost,
  type GeoPoint,
} from '@/supabase/queries';

const SHELVES = [
  { id: 'All', label: 'All Shelves', emoji: '🏪' },
  { id: 'Furniture', label: 'Furniture', emoji: '🛋️' },
  { id: 'Clothing', label: 'Clothing', emoji: '👗' },
  { id: 'Electronics', label: 'Electronics', emoji: '📱' },
  { id: 'Books', label: 'Books', emoji: '📚' },
  { id: 'Decor', label: 'Decor', emoji: '🪴' },
  { id: 'Other', label: 'Other', emoji: '📦' },
] as const;

type ShelfId = (typeof SHELVES)[number]['id'];

const TRENDING_TAGS = [
  '#VintageSteelers',
  '#MCM',
  '#PittMovingSale',
  '#ThriftFinds',
  '#Vinyl',
  '#ISO',
];

const RADIUS_OPTIONS: { label: string; miles: number }[] = [
  { label: 'Neighborhood', miles: 0 },
  { label: '5 mi', miles: 5 },
  { label: '10 mi', miles: 10 },
  { label: '20 mi', miles: 20 },
];

function milesBetween(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusMiles = 3958.8;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function ExploreCard({ post }: { post: DiscoverySalePost }) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Pressable
      onPress={() => router.push(`/listing/${post.id}`)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Image source={{ uri: post.images[0] }} style={styles.cardImage} contentFit="cover" />

      <View style={styles.cardOverlayTop}>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{post.price === 0 ? 'Offer' : `$${post.price}`}</Text>
        </View>
      </View>

      <View style={styles.cardOverlayBottom}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.neighborhoodPill}>
            <Text style={styles.neighborhoodText}>{post.neighborhoodTag}</Text>
          </View>
          <Text style={styles.distanceText}>{post.distanceMiles.toFixed(1)} mi</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ExploreTabScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ShelfId>('All');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeRadius, setActiveRadius] = useState(0);

  const [userCoords, setUserCoords] = useState<GeoPoint>(DEFAULT_PITTSBURGH_COORDS);
  const [neighborhood, setNeighborhood] = useState('Pittsburgh');
  const [listings, setListings] = useState<DiscoverySalePost[]>([]);
  const [loading, setLoading] = useState(true);

  const lastCoordsRef = useRef<GeoPoint>(DEFAULT_PITTSBURGH_COORDS);

  useEffect(() => {
    if (!user) return;
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
        }
      } catch {
        // Fall back to default Pittsburgh center.
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoading(true);

    fetchDiscoveryFeed({ userCoords, radiusMiles: activeRadius })
      .then((result) => {
        if (!mounted) return;
        setNeighborhood(result.neighborhood);
        setListings(result.listings);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user, activeRadius, userCoords]);

  const filtered = useMemo(() => {
    return listings.filter((post) => {
      const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        post.title.toLowerCase().includes(q) ||
        post.seller.username.toLowerCase().includes(q);
      const matchesTag = activeTag == null || post.hashtags.includes(activeTag);
      return matchesCategory && matchesSearch && matchesTag;
    });
  }, [activeCategory, activeTag, listings, search]);

  const [leftCol, rightCol] = useMemo(() => {
    const left: DiscoverySalePost[] = [];
    const right: DiscoverySalePost[] = [];

    filtered.forEach((post, idx) => {
      if (idx % 2 === 0) {
        left.push(post);
      } else {
        right.push(post);
      }
    });

    return [left, right];
  }, [filtered]);

  if (!user) {
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
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.rounded }]}>Discover</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Trending in {neighborhood}</Text>

        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search Buyinz listings..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {SHELVES.map((shelf) => {
            const selected = shelf.id === activeCategory;
            return (
              <Pressable
                key={shelf.id}
                onPress={() => setActiveCategory(shelf.id)}
                style={[
                  styles.chip,
                  selected
                    ? { backgroundColor: Brand.primary, borderColor: Brand.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : colors.text }]}>
                  {shelf.emoji} {shelf.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {TRENDING_TAGS.map((tag) => {
            const selected = activeTag === tag;
            return (
              <Pressable
                key={tag}
                onPress={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                style={[
                  styles.tagChip,
                  selected
                    ? { backgroundColor: `${Brand.primary}22`, borderColor: Brand.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.tagChipText, { color: selected ? Brand.primary : colors.textSecondary }]}>
                  {tag}
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
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Try another shelf, tag, or radius.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
          <View style={styles.gridRow}>
            <View style={styles.column}>
              {leftCol.map((post) => (
                <ExploreCard key={post.id} post={post} />
              ))}
            </View>
            <View style={[styles.column, styles.offsetColumn]}>
              {rightCol.map((post) => (
                <ExploreCard key={post.id} post={post} />
              ))}
            </View>
          </View>
        </ScrollView>
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
    gap: 10,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
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
  feedContent: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 120,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    gap: 8,
  },
  offsetColumn: {
    marginTop: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 230,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  cardOverlayTop: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pricePill: {
    backgroundColor: Brand.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cardOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(0,0,0,0.58)',
    gap: 6,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  neighborhoodPill: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  neighborhoodText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
