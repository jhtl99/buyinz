import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CARD_DIGITS_LEN,
  CVV_LEN_MAX,
  isValidCardNumber,
  isValidCvv,
  isValidExpiry,
} from '@/lib/cardValidation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { syncBuyinzProToSupabase } from '@/supabase/queries';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Mode = 'manual' | 'photo';

export function BuyinzProSubscribeModal({ visible, onClose }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { setBuyinzPro } = useSubscription();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>('manual');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cardPhotoUri, setCardPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setMode('manual');
    setCardNumber('');
    setCvv('');
    setExpiry('');
    setCardPhotoUri(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickCardPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Camera access is needed to photograph your card (mock).');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCardPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Photo library access is needed for this mock.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCardPhotoUri(result.assets[0].uri);
    }
  };

  const onExpiryChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) {
      setExpiry(digits);
      return;
    }
    setExpiry(`${digits.slice(0, 2)}/${digits.slice(2, 4)}`);
  };

  const completeSubscribe = async () => {
    setBusy(true);
    try {
      await setBuyinzPro(true);
      if (user?.id) {
        try {
          await syncBuyinzProToSupabase(user.id, true);
        } catch (e) {
          console.warn('[BuyinzPro] syncBuyinzProToSupabase failed', e);
        }
      }
      Alert.alert('Welcome to Buyinz Pro', 'You can now create unlimited listings.', [
        { text: 'Great', onPress: handleClose },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleSubscribe = () => {
    if (mode === 'photo') {
      if (!cardPhotoUri) {
        Alert.alert('Photo required', 'Add a photo of your card for this mock checkout (any image works).');
        return;
      }
      void completeSubscribe();
      return;
    }

    if (!isValidCardNumber(cardNumber)) {
      Alert.alert(
        'Card number',
        `Enter exactly ${CARD_DIGITS_LEN} digits (spaces are ignored).`,
      );
      return;
    }
    if (!isValidCvv(cvv)) {
      Alert.alert('CVV', `Enter ${3}–${CVV_LEN_MAX} digits.`);
      return;
    }
    if (!isValidExpiry(expiry)) {
      Alert.alert('Expiry', 'Use MM/YY with a slash, e.g. 08/27. Month must be 01–12.');
      return;
    }
    void completeSubscribe();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable hitSlop={12} onPress={handleClose}>
            <Text style={{ color: colors.tint, fontSize: 17 }}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Buyinz Pro</Text>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.blurb, { color: colors.textSecondary }]}>
            Mock subscription: unlimited listings. Free accounts are limited to 6 listings.
          </Text>

          <View style={styles.segment}>
            <Pressable
              style={[
                styles.segmentBtn,
                mode === 'manual' && { backgroundColor: Brand.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setMode('manual')}
            >
              <Text style={[styles.segmentText, { color: mode === 'manual' ? '#fff' : colors.text }]}>
                Enter card
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentBtn,
                mode === 'photo' && { backgroundColor: Brand.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setMode('photo')}
            >
              <Text style={[styles.segmentText, { color: mode === 'photo' ? '#fff' : colors.text }]}>
                Photo of card
              </Text>
            </Pressable>
          </View>

          {mode === 'manual' ? (
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Card number</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="XXXX XXXX XXXX XXXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={setCardNumber}
                maxLength={19}
              />
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Expiry</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    value={expiry}
                    onChangeText={onExpiryChange}
                    maxLength={5}
                  />
                </View>
                <View style={[styles.rowItem, { marginLeft: 12 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>CVV</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="XXX"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    secureTextEntry
                    value={cvv}
                    onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, CVV_LEN_MAX))}
                    maxLength={CVV_LEN_MAX}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Any photo is accepted for this demo.
              </Text>
              {cardPhotoUri ? (
                <Image source={{ uri: cardPhotoUri }} style={styles.preview} />
              ) : (
                <View style={[styles.previewPlaceholder, { borderColor: colors.border }]}>
                  <Ionicons name="card-outline" size={40} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No photo yet</Text>
                </View>
              )}
              <View style={styles.photoActions}>
                <Pressable
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                  onPress={pickCardPhoto}
                >
                  <Ionicons name="camera-outline" size={20} color={colors.text} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Take photo</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                  onPress={pickFromLibrary}
                >
                  <Ionicons name="images-outline" size={20} color={colors.text} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Choose photo</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: Brand.primary }, busy && { opacity: 0.7 }]}
            onPress={handleSubscribe}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Subscribe — $9.99/mo (mock)</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 40 },
  blurb: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  segment: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: { fontWeight: '600', fontSize: 14 },
  form: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  row: { flexDirection: 'row' },
  rowItem: { flex: 1 },
  preview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  previewPlaceholder: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 14 },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
