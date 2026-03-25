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
import { Colors, Brand, ConditionColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PhotoPicker } from '@/components/create/PhotoPicker';
import {
  EMPTY_DRAFT,
  CONDITIONS,
  CATEGORIES,
  isDraftValid,
  submitListing,
  type ListingDraft,
  type ImageAsset,
} from '@/lib/listings';

export default function CreateListingScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<ListingDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const priceRef = useRef<TextInput>(null);
  const zipRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);
  const tagsRef = useRef<TextInput>(null);

  const canSubmit = isDraftValid(draft);

  const update = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitListing(draft);
      if (result.success) {
        Alert.alert('Listed!', 'Your item is now live.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      }
    } catch(error) {
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
        {/* ── Photos ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Photos</Text>
          <PhotoPicker
            images={draft.images}
            onChange={(imgs: ImageAsset[]) => update('images', imgs)}
          />
        </View>

        {/* ── Title ── */}
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

        {/* ── Price ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Price</Text>
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

        {/* ── Condition ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Condition</Text>
          <View style={styles.chipRow}>
            {CONDITIONS.map((cond) => {
              const selected = draft.condition === cond;
              const cc = ConditionColors[cond];
              return (
                <Pressable
                  key={cond}
                  style={[
                    styles.chip,
                    selected
                      ? { backgroundColor: cc.bg, borderColor: cc.border }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => update('condition', selected ? null : cond)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? cc.text : colors.textSecondary },
                      selected && { fontWeight: '700' },
                    ]}
                  >
                    {cond}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Category ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const selected = draft.category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.chip,
                    selected
                      ? { backgroundColor: `${Brand.primary}20`, borderColor: Brand.primary }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => update('category', selected ? null : cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? Brand.primary : colors.textSecondary },
                      selected && { fontWeight: '700' },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Location ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Location</Text>
          <View style={[styles.zipRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              ref={zipRef}
              style={[styles.zipInput, { color: colors.text }]}
              placeholder="Zip code (e.g. 15213)"
              placeholderTextColor={colors.textSecondary}
              value={draft.zipCode}
              onChangeText={(v) => update('zipCode', v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => descRef.current?.focus()}
              maxLength={5}
            />
          </View>
        </View>

        {/* ── Description (optional) ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Description{' '}
            <Text style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</Text>
          </Text>
          <TextInput
            ref={descRef}
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Tell buyers about your item — condition details, sizing, brand, why you love it..."
            placeholderTextColor={colors.textSecondary}
            value={draft.description}
            onChangeText={(v) => update('description', v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
            returnKeyType="next"
            blurOnSubmit
            onSubmitEditing={() => tagsRef.current?.focus()}
          />
        </View>

        {/* ── Hashtags (optional) ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Tags{' '}
            <Text style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</Text>
          </Text>
          <TextInput
            ref={tagsRef}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="#vintage #pittsburgh #thrift"
            placeholderTextColor={colors.textSecondary}
            value={draft.hashtags}
            onChangeText={(v) => update('hashtags', v)}
            autoCapitalize="none"
            maxLength={120}
          />
        </View>
      </ScrollView>

      {/* ── Sticky Submit Button ── */}
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
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  zipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  zipInput: {
    flex: 1,
    fontSize: 16,
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
