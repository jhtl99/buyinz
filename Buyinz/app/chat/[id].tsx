import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  type KeyboardEvent,
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
import {
  LOCAL_DEMO_BUYING_CONVERSATION_ID,
  LOCAL_DEMO_SELLING_CONVERSATION_ID,
} from '@/lib/mockRatingDemo';
import { TransactionRatingModal } from '@/components/chat/TransactionRatingModal';
import { openUserProfile } from '@/lib/openUserProfile';

/**
 * Route params:
 * - `mockDemo=1` — synthetic buying thread (seller already finished).
 * - `mockDemo=2` — synthetic selling thread (you can finish first; rate before buyer finishes).
 * - `mockChat=1` — merge scripted messages into a real conversation (see `mockTransactionChat`).
 */
export default function ChatScreen() {
  const {
    id: listingId,
    buyerId: paramBuyerId,
    sellerId,
    sellerUsername,
    buyerUsername,
    peerUsername,
    listingTitle,
    listingPrice,
    listingImage,
    mockChat,
    mockDemo,
  } = useLocalSearchParams<{
    id: string;
    buyerId?: string;
    sellerId: string;
    sellerUsername?: string;
    buyerUsername?: string;
    peerUsername?: string;
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

  const isMockBuyingDemo = mockDemo === '1' || mockDemo === 'true';
  const isMockSellingFirstDemo = mockDemo === '2';
  const isLocalOnlyMock = isMockBuyingDemo || isMockSellingFirstDemo;
  const isMockChat =
    mockChat === '1' || mockChat === 'true' || isLocalOnlyMock;

  const localDemoConvId = isMockBuyingDemo
    ? LOCAL_DEMO_BUYING_CONVERSATION_ID
    : isMockSellingFirstDemo
      ? LOCAL_DEMO_SELLING_CONVERSATION_ID
      : null;

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
  /** Lifts composer above the keyboard; avoids relying on KeyboardAvoidingView alone (often fails with edge-to-edge / stack). */
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const rateeHandle =
    myRole === 'buyer'
      ? (peerUsername ?? sellerUsername ?? 'seller')
      : (peerUsername ?? buyerUsername ?? 'buyer');

  const headerPeerHandle = peerUsername ?? (amBuyer ? sellerUsername : buyerUsername) ?? 'user';

  const peerProfileUserId =
    myRole === 'buyer' ? effectiveSellerId : myRole === 'seller' ? effectiveBuyerId : null;

  const convIdForMocks = localDemoConvId ?? conversationId;

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

    if (isMockBuyingDemo) {
      setConversationId(LOCAL_DEMO_BUYING_CONVERSATION_ID);
      setCompletion({
        buyer_marked_complete_at: null,
        seller_marked_complete_at: new Date().toISOString(),
      });
      setRatingStars(null);
      setMessages([]);
      setLoading(false);
      setTxnMetaLoading(false);
      return;
    }

    if (isMockSellingFirstDemo) {
      setConversationId(LOCAL_DEMO_SELLING_CONVERSATION_ID);
      setCompletion({
        buyer_marked_complete_at: null,
        seller_marked_complete_at: null,
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
    isMockBuyingDemo,
    isMockSellingFirstDemo,
  ]);


  const iMarked =
    myRole === 'buyer'
      ? !!completion?.buyer_marked_complete_at
      : myRole === 'seller'
        ? !!completion?.seller_marked_complete_at
        : false;

  const otherMarked =
    myRole === 'buyer'
      ? !!completion?.seller_marked_complete_at
      : myRole === 'seller'
        ? !!completion?.buyer_marked_complete_at
        : false;

  const bothMarkedComplete = iMarked && otherMarked && !!myRole;
  const hasRated = ratingStars != null && ratingStars > 0;

  const ratingEligible =
    !!myRole &&
    !hasRated &&
    (bothMarkedComplete ||
      (isMockSellingFirstDemo && myRole === 'seller' && iMarked));
  const rateeId =
    myRole === 'buyer' ? effectiveSellerId : myRole === 'seller' ? effectiveBuyerId : '';

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length, listMessages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !currentUserId || sending) return;

    if (isLocalOnlyMock) {
      const cid = localDemoConvId;
      if (!cid) return;
      setSending(true);
      setInput('');
      const local: MessageRow = {
        id: `local-${Date.now()}`,
        conversation_id: cid,
        sender_id: currentUserId,
        body: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, local]);
      setSending(false);
      return;
    }

    if (!conversationId) return;

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
  }, [
    input,
    conversationId,
    currentUserId,
    sending,
    isLocalOnlyMock,
    localDemoConvId,
  ]);

  const handleFinishTransaction = useCallback(async () => {
    if (!myRole || finishingTxn) return;

    if (iMarked) {
      if (!otherMarked && !isLocalOnlyMock) {
        Alert.alert(
          'Waiting on the other person',
          `They still need to tap Finish Transaction before you can rate each other.`,
        );
      }
      return;
    }

    if (isLocalOnlyMock) {
      setFinishingTxn(true);
      try {
        const now = new Date().toISOString();
        setCompletion((prev) => ({
          buyer_marked_complete_at:
            myRole === 'buyer' ? now : (prev?.buyer_marked_complete_at ?? null),
          seller_marked_complete_at:
            myRole === 'seller' ? now : (prev?.seller_marked_complete_at ?? null),
        }));
        setRatingStars(null);

        if (isMockBuyingDemo) {
          setShowRatingModal(true);
        } else if (isMockSellingFirstDemo) {
          Alert.alert(
            'Great',
            `You've marked this transaction complete. You can rate @${rateeHandle} now. We're still waiting for them to finish on their side.`,
          );
          setShowRatingModal(true);
        }
      } finally {
        setFinishingTxn(false);
      }
      return;
    }

    if (!conversationId) return;

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
      const bothNow = iNow && otherNow;

      if (bothNow && (stars == null || stars < 1)) {
        setShowRatingModal(true);
      } else if (!bothNow) {
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
    otherMarked,
    currentUserId,
    isLocalOnlyMock,
    isMockBuyingDemo,
    isMockSellingFirstDemo,
    rateeHandle,
  ]);

  const handleSubmitRating = useCallback(
    async (stars: number) => {
      if (!currentUserId || stars < 1 || ratingSubmitting) {
        if (stars < 1) Alert.alert('Pick a rating', 'Choose 1–5 stars.');
        return;
      }

      setRatingSubmitting(true);
      try {
        if (isLocalOnlyMock) {
          setRatingStars(stars);
          setShowRatingModal(false);
          Alert.alert('Thanks!', 'Your rating has been saved.');
          return;
        }
        if (!conversationId || !rateeId) return;
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
    [conversationId, currentUserId, rateeId, ratingSubmitting, isLocalOnlyMock],
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

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    };
    const onHide = () => setKeyboardHeight(0);

    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  const txnStatusLine = (() => {
    if (!myRole) return '';
    if (hasRated) {
      if (isMockSellingFirstDemo && myRole === 'seller' && !otherMarked) {
        return `Thanks for your rating. We're still waiting for @${rateeHandle} to finish the transaction.`;
      }
      return `You rated this deal ${ratingStars}★`;
    }
    if (isMockBuyingDemo && myRole === 'buyer') {
      if (!iMarked) {
        return `The seller has finished on their side. Tap Finish Transaction when you're ready, then you can rate them.`;
      }
      return 'Rate your experience below.';
    }
    if (isMockSellingFirstDemo && myRole === 'seller') {
      if (!iMarked) {
        return `The buyer has not finished yet. Tap Finish Transaction when you're ready — you can rate them after you mark complete.`;
      }
      if (!otherMarked) {
        return `You've marked complete. You can rate @${rateeHandle} while we wait for them to finish.`;
      }
      return 'Rate your experience below.';
    }
    if (!iMarked) {
      if (otherMarked) {
        return `The other person has marked this transaction complete. Tap Finish Transaction when you're ready.`;
      }
      return 'When the sale is done, both parties tap Finish Transaction.';
    }
    if (!otherMarked) return 'Waiting for the other person to finish.';
    return 'Rate your experience below.';
  })();

  const showFinishButton = !!myRole && !iMarked && (isMockChat || !txnMetaLoading);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TransactionRatingModal
        visible={showRatingModal && ratingEligible}
        otherUsername={rateeHandle}
        busy={ratingSubmitting}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
        subtitle={
          isMockBuyingDemo
            ? "They've already finished on their side. How was your experience?"
            : isMockSellingFirstDemo
              ? 'How was your experience with this buyer?'
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
          {!isLocalOnlyMock && peerProfileUserId ? (
            <Pressable
              onPress={() => openUserProfile(router, peerProfileUserId, currentUserId)}
              hitSlop={6}
            >
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                @{headerPeerHandle}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              @{headerPeerHandle}
            </Text>
          )}
        </View>

        {price > 0 && (
          <View style={styles.headerPrice}>
            <Text style={styles.headerPriceText}>${price}</Text>
          </View>
        )}
      </View>

      {/* Scripted merge with server chat only when `mockChat` on a real thread (not local-only demos). */}
      {isMockChat && !isLocalOnlyMock && (
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
              {ratingEligible && !showRatingModal && (
                <Pressable
                  onPress={() => setShowRatingModal(true)}
                  style={[styles.rateLinkBtn, { borderColor: Brand.primary }]}
                >
                  <Text style={[styles.rateLinkText, { color: Brand.primary }]}>
                    Rate @{rateeHandle}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
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
            style={styles.container}
            data={listMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: keyboardHeight > 0 ? 8 : insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.muted, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!hasText || sending}
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
      </View>
    </View>
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
