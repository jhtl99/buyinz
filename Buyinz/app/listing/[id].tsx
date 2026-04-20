import { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { HeaderBackButton } from '@react-navigation/elements';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchSaleListingById,
  deleteOwnSaleListing,
} from '@/supabase/queries';
import { MOCK_FEED_POSTS, SalePost } from '@/data/mockData';
import { openUserProfile } from '@/lib/openUserProfile';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuth();

  const [post, setPost] = useState<SalePost | null>(null);
  const [listingSource, setListingSource] = useState<'db' | 'mock' | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setListingSource(null);
    try {
      const fromDb = await fetchSaleListingById(id);
      if (fromDb) {
        setPost(fromDb);
        setListingSource('db');
        return;
      }
      const found = MOCK_FEED_POSTS.find((p) => p.id === id && p.type === 'sale') as
        | SalePost
        | undefined;
      setListingSource(found ? 'mock' : null);
      setPost(found ?? null);
    } catch (e) {
      console.error('[listing detail] fetchSaleListingById failed', e);
      setPost(null);
      setListingSource(null);
      setLoadError(
        e instanceof Error
          ? e.message
          : 'Could not load this listing. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadPost();
    }, [loadPost]),
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!post || listingSource !== 'db') return;
    setDeleting(true);
    try {
      await deleteOwnSaleListing(post.id);
      router.back();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Could not delete this listing.';
      Alert.alert('Could not delete listing', message);
    } finally {
      setDeleting(false);
    }
  }, [post, listingSource, router]);

  const requestDelete = useCallback(() => {
    if (!post || listingSource !== 'db') return;
    Alert.alert(
      'Delete this listing?',
      'This permanently removes the listing from Buyinz. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleConfirmDelete();
          },
        },
      ],
    );
  }, [post, listingSource, handleConfirmDelete]);

  const handleHeaderBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  useLayoutEffect(() => {
    const headerLeft = () => (
      <HeaderBackButton tintColor={colors.text} onPress={handleHeaderBack} />
    );

    if (loading) {
      navigation.setOptions({
        title: 'Listing',
        headerLeft,
        headerRight: () => null,
      });
      return;
    }
    if (!post) {
      navigation.setOptions({
        title: 'Listing',
        headerLeft,
        headerRight: () => null,
      });
      return;
    }
    const showTrash = user?.id === post.seller.id && listingSource === 'db';
    const headline = post.title.trim().length > 0 ? post.title : 'Listing';
    const title = headline.length > 32 ? `${headline.slice(0, 32)}…` : headline;
    navigation.setOptions({
      title,
      headerLeft,
      headerRight: showTrash
        ? () =>
            deleting ? (
              <View style={{ paddingHorizontal: 12 }}>
                <ActivityIndicator color={Brand.primary} />
              </View>
            ) : (
              <Pressable
                onPress={requestDelete}
                hitSlop={12}
                accessibilityLabel="Delete listing"
                style={{ paddingHorizontal: 8 }}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </Pressable>
            )
        : undefined,
    });
  }, [
    loading,
    post,
    user?.id,
    listingSource,
    deleting,
    navigation,
    requestDelete,
    colors.text,
    handleHeaderBack,
  ]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        {loadError ? (
          <>
            <Text
              style={{
                color: colors.text,
                textAlign: 'center',
                marginBottom: 12,
                fontWeight: '600',
              }}
            >
              {"Couldn't load listing"}
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              {loadError}
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: Brand.primary }]}
              onPress={() => void loadPost()}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: colors.text }}>Listing not found</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <ScrollView horizontal pagingEnabled style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}>
          {post.images.length > 0 ? (
            post.images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                contentFit="cover"
              />
            ))
          ) : (
            <View
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_WIDTH,
                backgroundColor: colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
            </View>
          )}
        </ScrollView>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              {post.title.trim().length > 0 ? post.title : 'Listing'}
            </Text>
            {post.price != null ? (
              <Text style={[styles.price, { color: Brand.primary }]}>${post.price}</Text>
            ) : null}
          </View>

          <Pressable
            style={[styles.sellerRow, { borderBottomColor: colors.border, borderTopColor: colors.border }]}
            onPress={() => openUserProfile(router, post.seller.id, user?.id)}
          >
            <Image source={{ uri: post.seller.avatar }} style={[styles.avatar, { borderColor: colors.border }]} />
            <View style={styles.sellerInfo}>
              <Text style={[styles.sellerName, { color: colors.text }]}>{post.seller.displayName}</Text>
              <Text style={[styles.sellerMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                @{post.seller.username} · {post.createdAt}
              </Text>
            </View>
          </Pressable>

          {post.description.trim().length > 0 ? (
            <Text style={[styles.description, { color: colors.text }]}>{post.description}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sellerMeta: {
    fontSize: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 12,
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
