import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  type AccountType,
  checkUsernameAvailable,
  deleteProfileForCurrentUser,
  fetchBuyinzUserRowByAuthId,
  normalizeUsername,
  saveProfile,
  supabase,
  validateProfileUpdate,
} from '@/lib/supabase';
import { resolveAvatarUrlForProfileSave } from '@/supabase/queries';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1517841905240-472988babdf9';

type UsernameCheck = 'idle' | 'checking' | 'ok' | 'taken' | 'error';

export default function EditProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();

  const [accountType, setAccountType] = useState<AccountType>('user');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

  const [isLoading, setIsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>('idle');
  const [hydrated, setHydrated] = useState(false);
  /** Geocoder line from DB; shown read-only for stores. */
  const [storeFormattedAddressLine, setStoreFormattedAddressLine] =
    useState('');

  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      router.replace('/(tabs)/profile');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchBuyinzUserRowByAuthId(uid);
        if (cancelled) return;
        setAccountType(row?.account_type ?? user.account_type ?? 'user');
        setDisplayName(row?.display_name ?? user.display_name);
        setUsername(row?.username ?? user.username);
        setAddressLine1(row?.address_line1 ?? '');
        setCity(row?.city ?? '');
        setRegion(row?.region ?? '');
        setPostalCode(row?.postal_code ?? '');
        setBio(row?.bio ?? user.bio ?? '');
        setAvatarUrl(row?.avatar_url ?? user.avatar_url ?? DEFAULT_AVATAR);
        setStoreFormattedAddressLine(row?.formatted_address ?? '');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  useEffect(() => {
    if (!user?.id || !hydrated) return;
    const u = normalizeUsername(username);
    if (!u) {
      setUsernameCheck('idle');
      return;
    }
    setUsernameCheck('checking');
    const t = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(u, { excludeUserId: user.id });
        setUsernameCheck(ok ? 'ok' : 'taken');
      } catch {
        setUsernameCheck('error');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [username, user?.id, hydrated]);

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const u = normalizeUsername(username);
      if (!u) {
        throw new Error('Please choose a username.');
      }
      const available = await checkUsernameAvailable(u, {
        excludeUserId: user.id,
      });
      if (!available) {
        throw new Error('This username is already taken.');
      }

      const avatar_url = await resolveAvatarUrlForProfileSave(avatarUrl, user.id);

      if (accountType === 'user') {
        const profilePayload = {
          id: user.id,
          account_type: 'user' as const,
          display_name: displayName,
          username,
          location: '',
          bio: '',
          avatar_url,
        };

        validateProfileUpdate(profilePayload);

        await saveProfile(profilePayload);
        setUser({
          ...profilePayload,
          email: user.email,
        });

        Alert.alert('Success', 'Profile updated.');
        router.back();
        return;
      }

      const row = await fetchBuyinzUserRowByAuthId(user.id);
      if (!row || row.account_type !== 'store') {
        throw new Error('Could not load your store profile.');
      }

      const profilePayload = {
        id: user.id,
        account_type: 'store' as const,
        display_name: displayName.trim(),
        username,
        bio,
        avatar_url,
        location: row.location ?? '',
        address_line1: row.address_line1,
        city: row.city,
        region: row.region,
        postal_code: row.postal_code,
        address_string: row.address_string,
        latitude: row.latitude,
        longitude: row.longitude,
        formatted_address: row.formatted_address,
      };

      validateProfileUpdate(profilePayload);

      await saveProfile(profilePayload);
      setUser({
        ...profilePayload,
        email: user.email,
      });

      Alert.alert('Success', 'Profile updated.');
      router.back();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not update profile';
      Alert.alert('Profile Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const performDelete = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
      await deleteProfileForCurrentUser(user.id);
      await supabase.auth.signOut();
      setUser(null);
      router.replace('/(tabs)/profile');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not delete profile';
      Alert.alert('Could not delete profile', message);
    } finally {
      setDeleting(false);
    }
  };

  const requestDelete = () => {
    Alert.alert(
      'Delete profile?',
      'This will remove your Buyinz profile from our database, including your display name, username, and profile details. Your Google account is not deleted—you can sign in again to create a new profile. Related data (such as listings) may be affected by how your account is linked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            Alert.alert(
              'Permanently delete profile?',
              'This cannot be undone. You will be signed out.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete profile',
                  style: 'destructive',
                  onPress: () => {
                    void performDelete();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const userCoreFilled = !!displayName.trim() && !!normalizeUsername(username);

  const storeCoreFilled =
    !!displayName.trim() && !!normalizeUsername(username);

  const coreFilled =
    accountType === 'user' ? userCoreFilled : storeCoreFilled;

  const storeAddressReadOnly = [addressLine1, city, region, postalCode]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');

  const saveDisabled =
    isLoading || deleting || !coreFilled || usernameCheck !== 'ok';

  const usernameHint = () => {
    if (!normalizeUsername(username)) return null;
    if (usernameCheck === 'checking') {
      return (
        <Text style={[styles.hint, { color: colors.tabIconDefault }]}>
          Checking username…
        </Text>
      );
    }
    if (usernameCheck === 'taken') {
      return (
        <Text style={[styles.hint, { color: '#ef4444' }]}>
          Username is already taken
        </Text>
      );
    }
    if (usernameCheck === 'ok') {
      return (
        <Text style={[styles.hint, { color: '#16a34a' }]}>Username available</Text>
      );
    }
    if (usernameCheck === 'error') {
      return (
        <Text style={[styles.hint, { color: '#ef4444' }]}>
          Could not verify username
        </Text>
      );
    }
    return null;
  };

  if (!user) {
    return null;
  }

  if (!hydrated) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Edit profile
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, { borderColor: colors.border }]}
            />
            <Pressable style={styles.changePhotoBtn} onPress={handleImagePick}>
              <Text style={[styles.changePhotoText, { color: colors.tint }]}>
                Change Profile Photo
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            placeholder={
              accountType === 'store'
                ? 'Business name (Required)'
                : 'Name (Required)'
            }
            placeholderTextColor={colors.tabIconDefault}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Username (Required)"
            placeholderTextColor={colors.tabIconDefault}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameHint()}
          {accountType === 'user' ? null : (
            <View style={{ marginBottom: 12 }}>
              <Text
                style={[
                  styles.readOnlySectionLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Store location
              </Text>
              <Text
                style={[styles.readOnlyAddress, { color: colors.text }]}
              >
                {storeFormattedAddressLine.trim() ||
                  storeAddressReadOnly ||
                  '—'}
              </Text>
              <Text
                style={[styles.readOnlyHint, { color: colors.tabIconDefault }]}
              >
                Address was saved when you created your store and can’t be
                edited here.
              </Text>
            </View>
          )}
          {accountType === 'store' ? (
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Bio (optional)"
              placeholderTextColor={colors.tabIconDefault}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />
          ) : null}

          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.tint },
              { marginTop: 16 },
              saveDisabled && styles.primaryBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saveDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Update Your Profile</Text>
            )}
          </Pressable>
        </View>

        <View
          style={[
            styles.dangerSection,
            {
              backgroundColor: scheme === 'light' ? 'rgba(157, 54, 41, 0.08)' : 'rgba(157, 54, 41, 0.16)',
              borderColor: 'rgba(157, 54, 41, 0.45)',
            },
          ]}
        >
          <Text style={[styles.dangerTitle, { color: colors.text }]}>
            Delete profile
          </Text>
          <Text
            style={[styles.dangerCopy, { color: colors.textSecondary }]}
          >
            Permanently remove your Buyinz profile from our servers. You will be
            signed out. Your Google account stays the same—you can sign in again
            later to set up a new profile if you choose.
          </Text>
          <Pressable
            style={[
              styles.dangerBtn,
              { borderColor: '#ef4444' },
              (isLoading || deleting) && styles.primaryBtnDisabled,
            ]}
            onPress={requestDelete}
            disabled={isLoading || deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text style={styles.dangerBtnText}>Delete profile</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: 'bold',
    fontFamily: Fonts.serif,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  hint: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
    fontFamily: Fonts.sans,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    marginBottom: 8,
  },
  changePhotoBtn: {
    padding: 8,
  },
  changePhotoText: {
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
  readOnlySectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.sans,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  readOnlyAddress: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: Fonts.sans,
  },
  readOnlyHint: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.sans,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
  dangerSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: Fonts.serif,
  },
  dangerCopy: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: Fonts.sans,
  },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
});
