import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrCreateConversation,
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  fetchConversationCompletion,
  markMyTransactionComplete,
  fetchMyRatingForConversation,
  submitConversationRating,
  type MessageRow,
  type ConversationCompletion,
} from '@/supabase/queries';
import { buildMockTransactionMessages } from '@/lib/mockTransactionChat';
import { LOCAL_DEMO_CONVERSATION_ID } from '@/lib/mockRatingDemo';
import { TransactionRatingModal } from '@/components/chat/TransactionRatingModal';

/**
 * Route params:
 * - `mockDemo=1` — local-only thread from the synthetic Buying row (`SYNTHETIC_RATING_CONVERSATION_ID`); no Supabase chat.
 * - `mockChat=1` — merge scripted messages into a real conversation (see `mockTransactionChat`).
 */
export default function ChatScreen() {
  const {
    id: listingId,
    buyerId: paramBuyerId,
    sellerId,
    sellerUsername,
    listingTitle,
    listingPrice,
    listingImage,
    mockChat,
    mockDemo,
  } = useLocalSearchParams<{
    id: string;
    buyerId?: string;
    sellerId: string;
    sellerUsername: string;
    listingTitle: string;
    listingPrice: string;
    listingImage: string;
    mockChat?: string;
    mockDemo?: string;
  }>();

  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const isFullMockDemo = mockDemo === '1' || mockDemo === 'true';
  const isMockChat =
    mockChat === '1' || mockChat === 'true' || isFullMockDemo;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [completion, setCompletion] = useState<ConversationCompletion | null>(null);
  const [ratingStars, setRatingStars] = useState<number | null | undefined>(undefined);
  const [txnMetaLoading, setTxnMetaLoading] = useState(false);
  const [finishingTxn, setFinishingTxn] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const currentUserId = user?.id;
  const price = parseFloat(listingPrice ?? '0');

  const effectiveBuyerId = paramBuyerId ?? currentUserId;
  const effectiveSellerId = sellerId;

  const amBuyer =
    !!currentUserId && !!effectiveBuyerId && currentUserId === effectiveBuyerId;
  const myRole: 'buyer' | 'seller' | null =
    !currentUserId || !effectiveSellerId || !effectiveBuyerId
      ? null
      : amBuyer
        ? 'buyer'
        : currentUserId === effectiveSellerId
          ? 'seller'
          : null;

  const convIdForMocks = isFullMockDemo ? LOCAL_DEMO_CONVERSATION_ID : conversationId;

  const mockMsgs = useMemo(() => {
    if (!isMockChat || !convIdForMocks || !effectiveBuyerId || !effectiveSellerId) {
      return [] as MessageRow[];
    }
    return buildMockTransactionMessages(
      convIdForMocks,
      effectiveBuyerId,
      effectiveSellerId,
    );
  }, [isMockChat, convIdForMocks, effectiveBuyerId, effectiveSellerId]);

  const listMessages = useMemo(() => {
    if (!isMockChat || mockMsgs.length === 0) return messages;
    const byId = new Map(messages.map((m) => [m.id, m]));
    for (const m of mockMsgs) {
      if (!byId.has(m.id)) byId.set(m.id, m);
    }
    return Array.from(byId.values()).sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [messages, isMockChat, mockMsgs]);

  const refreshTransactionMeta = useCallback(
    async (convoId: string, userId: string) => {
      setTxnMetaLoading(true);
      try {
        const [comp, stars] = await Promise.all([
          fetchConversationCompletion(convoId),
          fetchMyRatingForConversation(convoId, userId),
        ]);
        setCompletion(comp);
        setRatingStars(stars);
      } catch (err: any) {
        console.error('Transaction meta:', err);
        const msg = err?.message ?? 'Could not load transaction status.';
        Alert.alert(
          'Transaction status',
          `${msg}\n\nIf this persists, apply Supabase migrations for ratings (see supabase/migrations).`,
        );
        setCompletion({ buyer_marked_complete_at: null, seller_marked_complete_at: null });
        setRatingStars(null);
      } finally {
        setTxnMetaLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!currentUserId || !listingId || !effectiveSellerId || !effectiveBuyerId) {
      setLoading(false);
      return;
    }

    if (isFullMockDemo) {
      setConversationId(LOCAL_DEMO_CONVERSATION_ID);
      setCompletion({
        buyer_marked_complete_at: new Date().toISOString(),
        seller_marked_complete_at: new Date().toISOString(),
      });
      setRatingStars(null);
      setMessages([]);
      setLoading(false);
      setTxnMetaLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const convoId = await getOrCreateConversation(
          listingId,
          effectiveBuyerId,
          effectiveSellerId,
        );
        setConversationId(convoId);

        const [msgs] = await Promise.all([
          fetchMessages(convoId),
          refreshTransactionMeta(convoId, currentUserId),
        ]);
        setMessages(msgs);

        unsubscribe = subscribeToMessages(convoId, (newMsg) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        });
      } catch (err) {
        console.error('Chat init error:', err);
        Alert.alert('Error', 'Could not load conversation.');
      } finally {
        setLoading(false);
      }
    })();

    return () => unsubscribe?.();
  }, [
    currentUserId,
    listingId,
    effectiveBuyerId,
    effectiveSellerId,
    refreshTransactionMeta,
    isFullMockDemo,
  ]);


  const iMarked =
    myRole === 'buyer'
      ? !!completion?.buyer_marked_complete_at
      : myRole === 'seller'
        ? !!completion?.seller_marked_complete_at
        : false;

  const otherMarkedDb =
    myRole === 'buyer'
      ? !!completion?.seller_marked_complete_at
      : myRole === 'seller'
        ? !!completion?.buyer_marked_complete_at
        : false;

  const otherMarked = isMockChat || otherMarkedDb;
  const bothMarkedComplete = iMarked && otherMarked && !!myRole;
  const hasRated = ratingStars != null && ratingStars > 0;
  const rateeId =
    myRole === 'buyer' ? effectiveSellerId : myRole === 'seller' ? effectiveBuyerId : '';

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length, listMessages.length]);

  const handleSend = useCallback(async () => {
    if (isFullMockDemo) return;
    const text = input.trim();
    if (!text || !conversationId || !currentUserId || sending) return;

    setSending(true);
    setInput('');
    try {
      await sendMessage(conversationId, currentUserId, text);
    } catch (err) {
      console.error('Send error:', err);
      setInput(text);
      Alert.alert('Error', 'Message failed to send.');
    } finally {
      setSending(false);
    }
  }, [input, conversationId, currentUserId, sending, isFullMockDemo]);

  const handleFinishTransaction = useCallback(async () => {
    if (isFullMockDemo) return;
    if (!conversationId || !myRole || finishingTxn) return;

    if (iMarked) {
      if (!otherMarked && !isMockChat) {
        Alert.alert(
          'Waiting on the other person',
          `They still need to tap Finish Transaction before you can rate each other.`,
        );
      }
      return;
    }

    setFinishingTxn(true);
    try {
      await markMyTransactionComplete(conversationId, myRole);
      const [comp, stars] = await Promise.all([
        fetchConversationCompletion(conversationId),
        fetchMyRatingForConversation(conversationId, currentUserId!),
      ]);
      setCompletion(comp);
      setRatingStars(stars);

      const iNow =
        myRole === 'buyer'
          ? !!comp.buyer_marked_complete_at
          : !!comp.seller_marked_complete_at;
      const otherNow =
        myRole === 'buyer'
          ? !!comp.seller_marked_complete_at
          : !!comp.buyer_marked_complete_at;
      const bothNow = iNow && (isMockChat || otherNow);

      if (bothNow && (stars == null || stars < 1)) {
        setShowRatingModal(true);
      } else if (!bothNow && !isMockChat) {
        Alert.alert(
          'Marked complete',
          'When the other person finishes on their side, you can leave a rating.',
        );
      }
    } catch (err: any) {
      console.error('Finish transaction:', err);
      Alert.alert(
        'Could not update',
        err?.message ?? 'Check your connection and that Supabase migration for transaction columns is applied.',
      );
    } finally {
      setFinishingTxn(false);
    }
  }, [
    conversationId,
    myRole,
    finishingTxn,
    iMarked,
    isMockChat,
    currentUserId,
    isFullMockDemo,
  ]);

  const handleSubmitRating = useCallback(
    async (stars: number) => {
      if (
        !conversationId ||
        !currentUserId ||
        !rateeId ||
        stars < 1 ||
        ratingSubmitting
      ) {
        if (stars < 1) Alert.alert('Pick a rating', 'Choose 1–5 stars.');
        return;
      }

      setRatingSubmitting(true);
      try {
        if (isFullMockDemo) {
          setRatingStars(stars);
          setShowRatingModal(false);
          Alert.alert('Thanks!', 'Your rating has been saved.');
          return;
        }
        await submitConversationRating(conversationId, currentUserId, rateeId, stars);
        setRatingStars(stars);
        setShowRatingModal(false);
        Alert.alert('Thanks!', 'Your rating was submitted.');
      } catch (err: any) {
        console.error('Rating submit:', err);
        Alert.alert(
          'Rating failed',
          err?.message ?? 'You may have already rated this transaction, or RLS blocked the insert.',
        );
      } finally {
        setRatingSubmitting(false);
      }
    },
    [conversationId, currentUserId, rateeId, ratingSubmitting, isFullMockDemo],
  );

  const hasText = input.trim().length > 0;

  const renderMessage = useCallback(
    ({ item }: { item: MessageRow }) => {
      const isSelf = item.sender_id === currentUserId;
      return (
        <View style={[styles.msgRow, isSelf ? styles.msgRowSelf : styles.msgRowOther]}>
          <View
            style={[
              styles.bubble,
              isSelf
                ? [styles.bubbleSelf, { backgroundColor: `${Brand.primary}20` }]
                : [styles.bubbleOther, { backgroundColor: colors.muted }],
            ]}
          >
            <Text style={[styles.msgText, { color: colors.text }]}>{item.body}</Text>
            <Text style={[styles.msgTime, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      );
    },
    [currentUserId, colors],
  );

  if (!currentUserId) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="person-outline" size={48} color={colors.muted} />
        <Text style={[styles.emptyChatText, { color: colors.textSecondary, marginTop: 12 }]}>
          Sign in to send messages
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.signInBtn, { marginTop: 20 }]}>
          <Text style={styles.signInBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const txnStatusLine =
    !myRole
      ? ''
      : hasRated
        ? `You rated this deal ${ratingStars}★`
        : isFullMockDemo
          ? `@${sellerUsername ?? 'seller'} already left you a rating. Tap below to rate your experience.`
          : !iMarked
            ? otherMarked || isMockChat
              ? 'Other party marked complete — tap Finish Transaction to continue.'
              : 'When the sale is done, both tap Finish Transaction.'
            : !otherMarked && !isMockChat
              ? 'Waiting for the other person to finish.'
              : 'Rate your experience below.';

  const showFinishButton =
    !!myRole &&
    !hasRated &&
    !iMarked &&
    !isFullMockDemo &&
    (isMockChat || !txnMetaLoading);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TransactionRatingModal
        visible={showRatingModal && bothMarkedComplete && !hasRated}
        otherUsername={sellerUsername ?? 'user'}
        busy={ratingSubmitting}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
        subtitle={
          isFullMockDemo
            ? "They've already left you a rating. How was your experience?"
            : undefined
        }
      />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {listingImage ? (
          <View style={[styles.headerThumb, { backgroundColor: colors.muted }]}>
            <Image source={{ uri: listingImage }} style={styles.headerThumbImg} contentFit="cover" />
          </View>
        ) : (
          <View style={[styles.headerThumb, { backgroundColor: colors.muted }]}>
            <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {listingTitle ?? 'Listing'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            @{sellerUsername ?? 'user'}
          </Text>
        </View>

        {price > 0 && (
          <View style={styles.headerPrice}>
            <Text style={styles.headerPriceText}>${price}</Text>
          </View>
        )}
      </View>

      {/* Extra scripted messages (mockChat) — no banner for full local thread (mockDemo). */}
      {isMockChat && !isFullMockDemo && (
        <View style={[styles.mockBanner, { backgroundColor: `${Brand.primary}18` }]}>
          <Ionicons name="chatbubbles-outline" size={16} color={Brand.primary} />
          <Text style={[styles.mockBannerText, { color: colors.text }]}>
            Some messages in this thread are shown for context and are not stored on the server.
          </Text>
        </View>
      )}

      {myRole && (
        <View style={[styles.txnBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {txnMetaLoading ? (
            <ActivityIndicator size="small" color={Brand.primary} />
          ) : (
            <>
              <Text style={[styles.txnBarText, { color: colors.textSecondary }]}>{txnStatusLine}</Text>
              {showFinishButton && (
                <Pressable
                  onPress={() => void handleFinishTransaction()}
                  disabled={finishingTxn}
                  style={[styles.finishBtn, { backgroundColor: Brand.primary }]}
                >
                  {finishingTxn ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.finishBtnText}>Finish Transaction</Text>
                  )}
                </Pressable>
              )}
              {bothMarkedComplete && !hasRated && !showRatingModal && (
                <Pressable
                  onPress={() => setShowRatingModal(true)}
                  style={[styles.rateLinkBtn, { borderColor: Brand.primary }]}
                >
                  <Text style={[styles.rateLinkText, { color: Brand.primary }]}>Rate @{sellerUsername}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      {loading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      ) : listMessages.length === 0 ? (
        <View style={[styles.container, styles.centered]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyChatText, { color: colors.textSecondary }]}>
            Start the conversation!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View
        style={[
          styles.inputBar,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.muted, color: colors.text }]}
          placeholder={
            isFullMockDemo ? 'Rate this transaction above — messaging is closed here.' : 'Type a message...'
          }
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!isFullMockDemo}
        />
        <Pressable
          onPress={handleSend}
          disabled={isFullMockDemo || !hasText || sending}
          style={[
            styles.sendBtn,
            hasText && !sending
              ? { backgroundColor: Brand.primary }
              : { backgroundColor: colors.muted },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={18} color={hasText ? '#FFF' : colors.textSecondary} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerThumbImg: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerSub: {
    fontSize: 12,
  },
  headerPrice: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  headerPriceText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  mockBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  txnBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  txnBarText: {
    fontSize: 12,
    lineHeight: 17,
  },
  finishBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  rateLinkBtn: {
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  rateLinkText: {
    fontWeight: '700',
    fontSize: 14,
  },
  emptyChatText: {
    fontSize: 14,
    marginTop: 12,
  },
  signInBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signInBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  messagesList: {
    padding: 16,
    gap: 10,
  },
  msgRow: {
    marginBottom: 4,
  },
  msgRowSelf: {
    alignItems: 'flex-end',
  },
  msgRowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSelf: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
