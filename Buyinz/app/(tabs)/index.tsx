import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Switch,
  Dimensions,
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import type { Post } from '@/data/mockData';
import { fetchFriendsFeedPosts } from '@/supabase/queries';
import { SalePostCard } from '@/components/feed/SalePostCard';
import { ISOPostCard } from '@/components/feed/ISOPostCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = 12;
const CARD_V_PADDING = 6;

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [pageHeight, setPageHeight] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeFriendsOfFriends, setIncludeFriendsOfFriends] = useState(false);
  const feedRequestId = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    const id = ++feedRequestId.current;
    setLoading(true);
    const uid = user.id;
    fetchFriendsFeedPosts(uid, { includeSecondDegree: includeFriendsOfFriends })
      .then((data) => {
        if (feedRequestId.current === id) setPosts(data);
      })
      .catch(console.error)
      .finally(() => {
        if (feedRequestId.current === id) setLoading(false);
      });
  }, [user, includeFriendsOfFriends]);

  const cardWidth = SCREEN_WIDTH - CARD_H_PADDING * 2;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setPageHeight(e.nativeEvent.layout.height);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      if (pageHeight === 0) return null;

      const isSale = item.type === 'sale';

      return (
        <View
          style={[
            styles.page,
            {
              height: pageHeight,
              justifyContent: isSale ? undefined : 'center',
            },
          ]}
        >
          {isSale ? (
            <SalePostCard post={item} cardWidth={cardWidth} fill />
          ) : (
            <ISOPostCard post={item} />
          )}
        </View>
      );
    },
    [pageHeight, cardWidth],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );

  if (!user) {
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
        <View
          style={[
            styles.toggleInner,
            {
              backgroundColor: scheme === 'dark' ? 'rgba(28,31,42,0.92)' : 'rgba(255,255,255,0.92)',
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.toggleLabel, { color: colors.text }]} numberOfLines={2}>
            Include friends of friends
          </Text>
          <Switch
            value={includeFriendsOfFriends}
            onValueChange={setIncludeFriendsOfFriends}
            trackColor={{ false: colors.tabIconDefault, true: `${Brand.primary}88` }}
            thumbColor={includeFriendsOfFriends ? Brand.primary : '#f4f3f4'}
          />
        </View>
        <Pressable
          style={[
            styles.bellBtn,
            {
              backgroundColor: scheme === 'dark' ? 'rgba(28,31,42,0.8)' : 'rgba(255,255,255,0.8)',
            },
          ]}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <View style={styles.feedShell} onLayout={handleLayout}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Brand.primary} />
          </View>
        ) : !posts.length && pageHeight > 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
              Follow people to see their listings here.
            </Text>
          </View>
        ) : pageHeight > 0 ? (
          <FlatList
            data={posts}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            snapToAlignment="start"
            decelerationRate="fast"
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
          />
        ) : null}
      </View>
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
  toggleInner: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  feedShell: {
    flex: 1,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.primary,
  },
  page: {
    paddingHorizontal: CARD_H_PADDING,
    paddingVertical: CARD_V_PADDING,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
