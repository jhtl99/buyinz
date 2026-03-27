import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  visible: boolean;
  otherUsername: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (stars: number) => void;
  /** Optional subtitle under the title (e.g. “they already rated you” flow). */
  subtitle?: string;
};

export function TransactionRatingModal({
  visible,
  otherUsername,
  busy,
  onClose,
  onSubmit,
  subtitle,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (visible) setStars(0);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Rate @{otherUsername}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {subtitle ??
              'Both of you marked this transaction complete. How did it go?'}
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} disabled={busy}>
                <Ionicons
                  name={stars >= n ? 'star' : 'star-outline'}
                  size={36}
                  color={stars >= n ? '#F59E0B' : colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => onSubmit(stars)}
              disabled={busy || stars < 1}
              style={[
                styles.primaryBtn,
                (busy || stars < 1) && styles.btnDisabled,
                { backgroundColor: Brand.primary },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit rating</Text>
              )}
            </Pressable>
            <Pressable onPress={onClose} disabled={busy} style={styles.secondaryBtn}>
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Later</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
