import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFollowers,
  getFollowing,
  getIncomingFollowRequests,
  getRecommendedProfiles,
  respondToFollowRequest,
  searchUsers,
  sendFollowRequest,
  type IncomingFollowRequest,
  type SocialConnectionStatus,
  type SocialUser,
} from '@/supabase/queries';

type SocialTab = 'discover' | 'requests' | 'followers' | 'following';

type SearchResultUser = SocialUser & { connectionStatus: SocialConnectionStatus };

const TAB_LABELS: Record<SocialTab, string> = {
  discover: 'Discover',
  requests: 'Requests',
  followers: 'Followers',
  following: 'Following',
};

function ConnectionAction({
  status,
  onFollow,
  disabled,
}: {
  status: SocialConnectionStatus;
  onFollow: () => void;
  disabled?: boolean;
}) {
  if (status === 'accepted') {
    return (
      <View style={[styles.pillBtn, styles.pillAccepted]}>
        <Text style={styles.pillAcceptedText}>Following</Text>
      </View>
    );
  }

  if (status === 'pending_sent') {
    return (
      <View style={[styles.pillBtn, styles.pillRequested]}>
        <Text style={styles.pillRequestedText}>Requested</Text>
      </View>
    );
  }

  if (status === 'pending_received') {
    return (
      <View style={[styles.pillBtn, styles.pillRequested]}>
        <Text style={styles.pillRequestedText}>Incoming</Text>
      </View>
    );
  }

  if (status === 'follows_you') {
    return (
      <Pressable style={styles.pillBtnPrimary} onPress={onFollow} disabled={disabled}>
        <Text style={styles.pillPrimaryText}>{disabled ? '...' : 'Follow back'}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.pillBtnPrimary} onPress={onFollow} disabled={disabled}>
      <Text style={styles.pillPrimaryText}>{disabled ? '...' : 'Follow'}</Text>
    </Pressable>
  );
}

function UserCard({
  user,
  right,
  textColor,
  subtextColor,
  cardColor,
}: {
  user: SocialUser;
  right?: React.ReactNode;
  textColor: string;
  subtextColor: string;
  cardColor: string;
}) {
  return (
    <View style={[styles.userCard, { backgroundColor: cardColor }]}>
      <Image
        source={{
          uri:
            user.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/png?seed=${user.username}`,
        }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: textColor }]}>{user.display_name || user.username}</Text>
        <Text style={[styles.username, { color: subtextColor }]}>@{user.username}</Text>
      </View>
      {right}
    </View>
  );
}

export default function SocialScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { user } = useAuth();

  const initialTab: SocialTab =
    tab === 'requests' || tab === 'followers' || tab === 'following' ? tab : 'discover';

  const [activeTab, setActiveTab] = useState<SocialTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [recommended, setRecommended] = useState<SocialUser[]>([]);
  const [incoming, setIncoming] = useState<IncomingFollowRequest[]>([]);
  const [followers, setFollowers] = useState<SocialUser[]>([]);
  const [following, setFollowing] = useState<SocialUser[]>([]);
  const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(null);

  const hasSearch = query.trim().length > 0;

  const refreshSocialData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [recommendedData, incomingData, followersData, followingData] = await Promise.all([
        getRecommendedProfiles(user.id, 6),
        getIncomingFollowRequests(user.id),
        getFollowers(user.id),
        getFollowing(user.id),
      ]);

      setRecommended(recommendedData);
      setIncoming(incomingData);
      setFollowers(followersData);
      setFollowing(followingData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSocialData().catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const term = query.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(user.id!, term)
        .then(setSearchResults)
        .catch((e) => {
          console.error(e);
          setSearchResults([]);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, user?.id]);

  const requestCount = incoming.length;
  const cardColor = scheme === 'light' ? 'rgba(120,120,120,0.08)' : 'rgba(255,255,255,0.08)';

  const handleFollow = async (target: SocialUser) => {
    if (!user?.id) return;

    setPendingActionUserId(target.id);
    try {
      const res = await sendFollowRequest(user.id, target.id);
      if (res.created || res.reason === 'already_pending') {
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === target.id ? { ...u, connectionStatus: 'pending_sent' } : u,
          ),
        );
        setRecommended((prev) => prev.filter((u) => u.id !== target.id));
      }

      if (res.reason === 'incoming_request_exists') {
        setActiveTab('requests');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPendingActionUserId(null);
    }
  };

  const handleRequestAction = async (
    requestId: string,
    action: 'accept' | 'decline',
    fromUserId: string,
  ) => {
    setPendingActionUserId(fromUserId);
    try {
      await respondToFollowRequest(requestId, action);
      setIncoming((prev) => prev.filter((r) => r.requestId !== requestId));
      if (action === 'accept') {
        const acceptedUser = incoming.find((r) => r.requestId === requestId)?.fromUser;
        if (acceptedUser) {
          setFollowers((prev) => [acceptedUser, ...prev.filter((u) => u.id !== acceptedUser.id)]);
          setSearchResults((prev) =>
            prev.map((u) =>
              u.id === acceptedUser.id
                ? { ...u, connectionStatus: 'follows_you' }
                : u,
            ),
          );
        }
      }

      refreshSocialData().catch(console.error);
    } catch (e) {
      console.error(e);
    } finally {
      setPendingActionUserId(null);
    }
  };

  const discoverList = useMemo(() => {
    if (hasSearch) {
      return searchResults.map((candidate) => (
        <UserCard
          key={candidate.id}
          user={candidate}
          textColor={colors.text}
          subtextColor={colors.tabIconDefault}
          cardColor={cardColor}
          right={
            <ConnectionAction
              status={candidate.connectionStatus}
              disabled={pendingActionUserId === candidate.id}
              onFollow={() => handleFollow(candidate)}
            />
          }
        />
      ));
    }

    return recommended.map((candidate) => (
      <UserCard
        key={candidate.id}
        user={candidate}
        textColor={colors.text}
        subtextColor={colors.tabIconDefault}
        cardColor={cardColor}
        right={
          <ConnectionAction
            status="none"
            disabled={pendingActionUserId === candidate.id}
            onFollow={() => handleFollow(candidate)}
          />
        }
      />
    ));
  }, [hasSearch, pendingActionUserId, recommended, searchResults, colors.text, colors.tabIconDefault, cardColor]);

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <Ionicons name="people-outline" size={56} color={colors.tabIconDefault} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Create a profile first</Text>
        <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>You need an account to manage social connections.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/create-profile' as any)}>
          <Text style={styles.primaryBtnText}>Create Profile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}> 
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Connections</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.tabRow}>
        {(Object.keys(TAB_LABELS) as SocialTab[]).map((socialTab) => {
          const selected = activeTab === socialTab;
          return (
            <Pressable
              key={socialTab}
              style={[
                styles.tabBtn,
                selected && { backgroundColor: Brand.primary },
                !selected && { borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setActiveTab(socialTab)}
            >
              <Text style={[styles.tabText, { color: selected ? '#fff' : colors.text }]}> 
                {TAB_LABELS[socialTab]}
                {socialTab === 'requests' && requestCount > 0 ? ` (${requestCount})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'discover' ? (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: scheme === 'light' ? '#f8f8f8' : '#1E1E22' }]}> 
            <Ionicons name="search" size={18} color={colors.tabIconDefault} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search name or @username"
              placeholderTextColor={colors.tabIconDefault}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator size="large" color={Brand.primary} style={{ marginTop: 40 }} /> : null}

        {!loading && activeTab === 'discover' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {hasSearch ? 'Search Results' : 'Recommended Profiles'}
            </Text>
            {discoverList.length ? discoverList : <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>No profiles found.</Text>}
          </>
        ) : null}

        {!loading && activeTab === 'requests' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Incoming Follow Requests</Text>
            {incoming.length ? (
              incoming.map((req) => (
                <UserCard
                  key={req.requestId}
                  user={req.fromUser}
                  textColor={colors.text}
                  subtextColor={colors.tabIconDefault}
                  cardColor={cardColor}
                  right={
                    <View style={styles.requestActionsRow}>
                      <Pressable
                        style={[styles.smallActionBtn, { borderColor: colors.border }]}
                        onPress={() => handleRequestAction(req.requestId, 'decline', req.fromUser.id)}
                        disabled={pendingActionUserId === req.fromUser.id}
                      >
                        <Text style={[styles.smallActionText, { color: colors.text }]}>Decline</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.smallActionBtn, { backgroundColor: Brand.primary }]}
                        onPress={() => handleRequestAction(req.requestId, 'accept', req.fromUser.id)}
                        disabled={pendingActionUserId === req.fromUser.id}
                      >
                        <Text style={[styles.smallActionText, { color: '#fff' }]}>Accept</Text>
                      </Pressable>
                    </View>
                  }
                />
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>No pending requests.</Text>
            )}
          </>
        ) : null}

        {!loading && activeTab === 'followers' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Followers</Text>
            {followers.length ? (
              followers.map((f) => (
                <UserCard
                  key={f.id}
                  user={f}
                  textColor={colors.text}
                  subtextColor={colors.tabIconDefault}
                  cardColor={cardColor}
                />
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>No followers yet.</Text>
            )}
          </>
        ) : null}

        {!loading && activeTab === 'following' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>You Follow</Text>
            {following.length ? (
              following.map((f) => (
                <UserCard
                  key={f.id}
                  user={f}
                  textColor={colors.text}
                  subtextColor={colors.tabIconDefault}
                  cardColor={cardColor}
                />
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>Not following anyone yet.</Text>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  name: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  username: {
    fontSize: 12,
  },
  pillBtnPrimary: {
    backgroundColor: Brand.primary,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  pillBtn: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillRequested: {
    backgroundColor: '#E5E7EB',
  },
  pillRequestedText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 12,
  },
  pillAccepted: {
    backgroundColor: '#D1FAE5',
  },
  pillAcceptedText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 12,
  },
  requestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: Brand.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
});
