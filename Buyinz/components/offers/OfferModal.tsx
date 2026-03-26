import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface OfferModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  originalPrice: number;
}

export function OfferModal({ visible, onClose, onSubmit, originalPrice }: OfferModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDisplayValue = (text: string) => {
    // only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setAmount(cleaned);
  };

  const submit = async () => {
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    if (numAmount > originalPrice) {
      Alert.alert('Hold up', `You cannot offer more than the asking price of $${originalPrice}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(numAmount);
      setAmount('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={[styles.modalContent, { backgroundColor: colors.background, shadowColor: colors.text }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Make an Offer</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Asking Price: ${originalPrice}
          </Text>

          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.currencySymbol, { color: colors.text }]}>$</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              keyboardType="number-pad"
              value={amount}
              onChangeText={handleDisplayValue}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
          </View>

          <Pressable 
            style={[styles.submitButton, (!amount || isSubmitting) && styles.submitButtonDisabled]}
            onPress={submit}
            disabled={!amount || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Offer</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: Brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
