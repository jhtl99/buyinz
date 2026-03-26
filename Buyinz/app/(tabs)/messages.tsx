import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchConversations, type ConversationRow } from '@/supabase/queries';
import {
  getMockRatingDemoPost,
  getMockSellingRatingDemoPost,
  getSyntheticBuyingConversationRow,
  getSyntheticSellingConversationRow,
  SYNTHETIC_RATING_CONVERSATION_ID,
  SYNTHETIC_SELLING_RATING_CONVERSATION_ID,
} from '@/lib/mockRatingDemo';

type ChatTab = 'buying' | 'selling';

const TAB_ACCENT = {
  buying: { active: 'rgba(59,130,246,0.15)', text: '#3B82F6', dot: '#3B82F6' },
  selling: { active: 'rgba(244,63,94,0.15)', text: '#F43F5E', dot: '#F43F5E' },
} as const;

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ChatTab>('buying');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = user?.id;

  const loadConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchConversations(currentUserId);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConversations();
    }, [loadConversations]),
  );

  const demoListingId = useMemo(() => getMockRatingDemoPost().id, []);
  const sellingDemoListingId = useMemo(() => getMockSellingRatingDemoPost().id, []);

  const buyingChats = useMemo(() => {
    const fromServer = conversations.filter((c) => c.buyer_id === currentUserId);
    if (!user?.id) return fromServer;

    // Synthetic buying row — skip if a real thread exists for the same listing.
    if (fromServer.some((c) => c.listing_id === demoListingId)) return fromServer;

    const synthetic = getSyntheticBuyingConversationRow({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url ?? null,
    });
    return [synthetic, ...fromServer];
  }, [conversations, currentUserId, user, demoListingId]);

  const sellingChats = useMemo(() => {
    const fromServer = conversations.filter((c) => c.seller_id === currentUserId);
    if (!user?.id) return fromServer;
    if (fromServer.some((c) => c.listing_id === sellingDemoListingId)) return fromServer;

    const synthetic = getSyntheticSellingConversationRow({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url ?? null,
    });
    return [synthetic, ...fromServer];
  }, [conversations, currentUserId, user, sellingDemoListingId]);
  const currentChats = activeTab === 'buying' ? buyingChats : sellingChats;
  const accent = TAB_ACCENT[activeTab];

  if (!currentUserId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.headerArea}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 12 }]}>
            Sign in to see your messages
          </Text>
        </View>
      </View>
    );
  }

  const renderConversation = ({ item }: { item: ConversationRow }) => {
    const otherUser = item.buyer_id === currentUserId ? item.seller : item.buyer;
    const listing = item.listing;
    const lastMsg = item.last_message;
    const isMyLastMsg = lastMsg?.sender_id === currentUserId;
    const localMockDemo =
      item.id === SYNTHETIC_RATING_CONVERSATION_ID
        ? '1'
        : item.id === SYNTHETIC_SELLING_RATING_CONVERSATION_ID
          ? '2'
          : undefined;

    return (
      <Pressable
        style={[styles.chatRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() =>
          router.push({
            pathname: '/chat/[id]',
            params: {
              id: listing.id,
              buyerId: item.buyer_id,
              sellerId: item.seller_id,
              sellerUsername: item.seller.username,
              buyerUsername: item.buyer.username,
              peerUsername: otherUser.username,
              listingTitle: listing.title,
              listingPrice: String(listing.price ?? 0),
              listingImage: listing.images?.[0] ?? '',
              ...(localMockDemo ? { mockDemo: localMockDemo } : {}),
            },
          })
        }
      >
        <View style={[styles.chatThumb, { backgroundColor: colors.muted }]}>
          {listing.images?.[0] ? (
            <Image source={{ uri: listing.images[0] }} style={styles.chatThumbImg} contentFit="cover" />
          ) : (
            <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
          )}
        </View>

        <View style={styles.chatBody}>
          <View style={styles.chatTopRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>
                {listing.title}
              </Text>
              <Text style={[styles.chatUsername, { color: colors.textSecondary }]}>
                @{otherUser.username}
              </Text>
            </View>
            {lastMsg && (
              <Text style={[styles.chatTime, { color: colors.textSecondary }]}>
                {timeAgo(lastMsg.created_at)}
              </Text>
            )}
          </View>
          {lastMsg && (
            <Text style={[styles.chatPreview, { color: colors.textSecondary }]} numberOfLines={1}>
              {isMyLastMsg ? 'You: ' : ''}
              {lastMsg.body}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.headerArea}>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>

        <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
          {(['buying', 'selling'] as ChatTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const tabAccent = TAB_ACCENT[tab];
            const count = tab === 'buying' ? buyingChats.length : sellingChats.length;
            return (
              <Pressable
                key={tab}
                style={[styles.tab, isActive && { backgroundColor: tabAccent.active }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? tabAccent.text : colors.textSecondary },
                    isActive && { fontWeight: '700' },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {count > 0 ? ` (${count})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      ) : currentChats.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No {activeTab} conversations yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={renderConversation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chatThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatThumbImg: {
    width: '100%',
    height: '100%',
  },
  chatBody: {
    flex: 1,
    minWidth: 0,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  chatUsername: {
    fontSize: 12,
    marginTop: 1,
  },
  chatTime: {
    fontSize: 10,
  },
  chatPreview: {
    fontSize: 12,
    marginTop: 4,
  },
});
