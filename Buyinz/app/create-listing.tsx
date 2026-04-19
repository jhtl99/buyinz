import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { PhotoPicker } from '@/components/create/PhotoPicker';
import {
  EMPTY_DRAFT,
  isDraftValid,
  LISTING_CATEGORIES,
  submitListing,
  type ImageAsset,
  type ListingCategory,
  type ListingDraft,
} from '@/lib/listings';

const CATEGORY_EMOJI: Record<ListingCategory, string> = {
  Furniture: '🛋️',
  Clothing: '👗',
  Electronics: '📱',
  Books: '📚',
  Decor: '🪴',
  Other: '📦',
};

export default function CreateListingScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [draft, setDraft] = useState<ListingDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const priceRef = useRef<TextInput>(null);

  const canSubmit = isDraftValid(draft);

  const update = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitListing(draft, user?.id);
      if (result.success) {
        Alert.alert('Listed!', 'Your item is now live.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Photos</Text>
          <PhotoPicker
            images={draft.images}
            onChange={(imgs: ImageAsset[]) => update('images', imgs)}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {LISTING_CATEGORIES.map((id) => {
              const selected = draft.category === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => update('category', id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? Brand.primary : colors.card,
                      borderColor: selected ? Brand.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[id]}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: selected ? '#fff' : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {id}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="What are you selling?"
            placeholderTextColor={colors.textSecondary}
            value={draft.title}
            onChangeText={(v) => update('title', v)}
            returnKeyType="next"
            onSubmitEditing={() => priceRef.current?.focus()}
            maxLength={80}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Price{' '}
            <Text style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</Text>
          </Text>
          <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.pricePrefix, { color: colors.textSecondary }]}>$</Text>
            <TextInput
              ref={priceRef}
              style={[styles.priceInput, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={draft.price}
              onChangeText={(v) => update('price', v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={8}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.submitBtn,
            canSubmit && !submitting
              ? { backgroundColor: Brand.primary, opacity: 1 }
              : { backgroundColor: colors.muted, opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="pricetag" size={18} color={canSubmit ? '#FFF' : colors.textSecondary} />
              <Text
                style={[
                  styles.submitText,
                  { color: canSubmit ? '#FFF' : colors.textSecondary },
                ]}
              >
                List It
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  pricePrefix: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
