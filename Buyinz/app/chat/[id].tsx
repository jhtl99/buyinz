import { useState, useRef, useEffect, useCallback } from 'react';
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
  type MessageRow,
} from '@/supabase/queries';

export default function ChatScreen() {
  const {
    id: listingId,
    buyerId: paramBuyerId,
    sellerId,
    sellerUsername,
    listingTitle,
    listingPrice,
    listingImage,
  } = useLocalSearchParams<{
    id: string;
    buyerId?: string;
    sellerId: string;
    sellerUsername: string;
    listingTitle: string;
    listingPrice: string;
    listingImage: string;
  }>();

  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const currentUserId = user?.id;
  const price = parseFloat(listingPrice ?? '0');

  // When opening from inbox, use the original buyer/seller IDs.
  // When opening from a listing card, current user is the buyer.
  const effectiveBuyerId = paramBuyerId ?? currentUserId;
  const effectiveSellerId = sellerId;

  useEffect(() => {
    if (!currentUserId || !listingId || !effectiveSellerId || !effectiveBuyerId) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const convoId = await getOrCreateConversation(listingId, effectiveBuyerId, effectiveSellerId);
        setConversationId(convoId);

        const msgs = await fetchMessages(convoId);
        setMessages(msgs);

        // Subscribe to new messages in real time
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
  }, [currentUserId, listingId, effectiveBuyerId, effectiveSellerId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
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
  }, [input, conversationId, currentUserId, sending]);

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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
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

      {/* Messages */}
      {loading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={[styles.container, styles.centered]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyChatText, { color: colors.textSecondary }]}>
            Start the conversation!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
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
