import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  normalizeUsStateRegion,
  validateUsStoreAddressFormat,
} from '@/lib/addressValidation';
import {
  authenticateWithGoogle,
  checkUsernameAvailable,
  composeStoreAddressString,
  fetchBuyinzUserRowByAuthId,
  geocodeAddressString,
  isProfileOnboardingComplete,
  normalizeUsername,
  saveProfile,
  storeAddressPartsComplete,
  supabase,
  validateOnboardingSave,
} from '@/lib/supabase';
import { resolveAvatarUrlForProfileSave } from '@/supabase/queries';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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

WebBrowser.maybeCompleteAuthSession();

type Phase = 'signIn' | 'onboarding';

type OnboardingSubphase = 'chooseType' | 'form';

type UsernameCheck = 'idle' | 'checking' | 'ok' | 'taken' | 'error';

type AccountKind = 'user' | 'store';

export default function CreateProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { setUser } = useAuth();

  const allowLeaveRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('signIn');
  const [oauthEmail, setOauthEmail] = useState('');

  const [onboardingSubphase, setOnboardingSubphase] =
    useState<OnboardingSubphase>('chooseType');
  const [accountKind, setAccountKind] = useState<AccountKind | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

  const [isLoading, setIsLoading] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>('idle');
  const [showValidation, setShowValidation] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'onboarding') return;
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
    });
    return sub;
  }, [phase, navigation]);

  useEffect(() => {
    if (phase !== 'onboarding') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [phase]);

  const startOnboarding = useCallback((authUser: SupabaseAuthUser) => {
    const email = authUser.email ?? '';
    setOauthEmail(email);
    const meta = authUser.user_metadata;
    setOnboardingSubphase('chooseType');
    setAccountKind(null);
    setDisplayName('');
    setUsername('');
    setAddressLine1('');
    setCity('');
    setRegion('');
    setPostalCode('');
    setBio('');
    setShowValidation(false);
    setAvatarUrl(
      (meta?.avatar_url as string) || DEFAULT_AVATAR,
    );
  }, []);

  const proceedAfterAuth = useCallback(
    async (authUser: SupabaseAuthUser) => {
      const row = await fetchBuyinzUserRowByAuthId(authUser.id);
      const email = authUser.email ?? '';

      if (row && isProfileOnboardingComplete(row)) {
        allowLeaveRef.current = true;
        setUser({
          id: authUser.id,
          email,
          account_type: row.account_type ?? 'user',
          display_name: row.display_name,
          username: row.username,
          location: row.location ?? '',
          bio: row.bio ?? '',
          avatar_url: row.avatar_url ?? undefined,
        });
        router.replace('/(tabs)/profile');
        return;
      }

      setPhase('onboarding');
      startOnboarding(authUser);
    },
    [router, setUser, startOnboarding],
  );

  useEffect(() => {
    if (phase !== 'onboarding' || onboardingSubphase !== 'form') {
      setUsernameCheck('idle');
      return;
    }
    const u = normalizeUsername(username);
    if (!u) {
      setUsernameCheck('idle');
      return;
    }
    setUsernameCheck('checking');
    const t = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(u);
        setUsernameCheck(ok ? 'ok' : 'taken');
      } catch {
        setUsernameCheck('error');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [username, phase, onboardingSubphase]);

  const switchAccountKind = (next: AccountKind) => {
    if (accountKind === next) return;
    if (next === 'user') {
      setAddressLine1('');
      setCity('');
      setRegion('');
      setPostalCode('');
      setBio('');
    }
    setAccountKind(next);
    setShowValidation(false);
  };

  const pickAccountKind = (kind: AccountKind) => {
    setAccountKind(kind);
    setOnboardingSubphase('form');
    setShowValidation(false);
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setAvatarUrl(asset.uri);
    }
  };

  const finishOAuthWithUser = async (authUser: SupabaseAuthUser) => {
    try {
      await proceedAfterAuth(authUser);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      Alert.alert('Error', message);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const { data, redirectUrl } = await authenticateWithGoogle();
      if (!data.url) return;

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
      );

      if (result.type === 'success' && result.url) {
        const parsedUrl = Linking.parse(result.url);
        const code = parsedUrl.queryParams?.code;

        if (code && typeof code === 'string') {
          const { data: sessionData, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (sessionData.user) {
            await finishOAuthWithUser(sessionData.user);
          }
        } else if (result.url.includes('#access_token')) {
          const fragment = result.url.split('#')[1];
          if (fragment) {
            const params = fragment.split('&').reduce(
              (acc, curr) => {
                const [k, v] = curr.split('=');
                acc[k] = v;
                return acc;
              },
              {} as Record<string, string>,
            );

            if (params.access_token && params.refresh_token) {
              const { data: sessionData, error } =
                await supabase.auth.setSession({
                  access_token: params.access_token,
                  refresh_token: params.refresh_token,
                });
              if (error) throw error;
              if (sessionData.user) {
                await finishOAuthWithUser(sessionData.user);
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Google sign-in failed';
      Alert.alert('Google Auth Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setShowValidation(true);
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (!authUser?.id) {
        throw new Error('Sign in with Google first.');
      }

      const email = authUser.email ?? oauthEmail;
      if (!email) {
        throw new Error('Your account has no email; try signing in again.');
      }

      if (!accountKind) {
        throw new Error('Choose Shopper or Store.');
      }

      const u = normalizeUsername(username);
      if (!u) {
        throw new Error('Please choose a username.');
      }
      const available = await checkUsernameAvailable(u);
      if (!available) {
        throw new Error('This username is already taken.');
      }

      const avatar_url = await resolveAvatarUrlForProfileSave(avatarUrl, authUser.id);

      if (accountKind === 'user') {
        const profilePayload = {
          id: authUser.id,
          account_type: 'user' as const,
          display_name: displayName,
          username,
          location: '',
          bio: undefined,
          avatar_url,
        };

        validateOnboardingSave(profilePayload);

        await saveProfile(profilePayload);
        allowLeaveRef.current = true;
        setUser({ ...profilePayload, email });

        const preview = `${displayName}\n@${normalizeUsername(username)}\n\nYou're set up to browse and list on Buyinz.`;

        Alert.alert('Profile created', preview, [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/profile'),
          },
        ]);
        return;
      }

      const regionNorm = normalizeUsStateRegion(region);
      const address_string = composeStoreAddressString({
        address_line1: addressLine1.trim(),
        city: city.trim(),
        region: regionNorm,
        postal_code: postalCode.trim(),
      });

      const profilePayloadBase = {
        id: authUser.id,
        account_type: 'store' as const,
        display_name: displayName,
        username,
        location: postalCode.trim(),
        bio,
        avatar_url,
        address_line1: addressLine1.trim(),
        city: city.trim(),
        region: regionNorm,
        postal_code: postalCode.trim(),
        address_string,
      };

      if (!storeAddressPartsComplete(profilePayloadBase)) {
        throw new Error(
          'Enter street, city, state, and ZIP so we can find your store.',
        );
      }

      const formatCheck = validateUsStoreAddressFormat({
        address_line1: addressLine1,
        city,
        region,
        postal_code: postalCode,
      });
      if (!formatCheck.ok) {
        throw new Error(formatCheck.message);
      }

      let geo;
      try {
        geo = await geocodeAddressString(address_string, {
          expectedPostalCode: postalCode.trim(),
          expectedRegion: regionNorm,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not locate address';
        setAddressError(msg);
        setIsLoading(false);
        return;
      }

      // If geocoder returned non-blocking warnings (e.g. partial match),
      // treat that as a blocking validation error for store onboarding.
      if (geo?.warnings && Array.isArray(geo.warnings) && geo.warnings.length > 0) {
        setAddressError(geo.warnings.join('\n\n'));
        setIsLoading(false);
        return;
      }

      const profilePayload = {
        ...profilePayloadBase,
        latitude: geo.latitude,
        longitude: geo.longitude,
        formatted_address: geo.formatted_address ?? null,
      };

      validateOnboardingSave(profilePayload);

      await saveProfile(profilePayload);
      allowLeaveRef.current = true;
      setUser({
        ...profilePayload,
        email,
      });

      const addrLine =
        geo.formatted_address ??
        composeStoreAddressString({
          address_line1: addressLine1.trim(),
          city: city.trim(),
          region: regionNorm,
          postal_code: postalCode.trim(),
        });

      let preview = `${displayName}\n@${normalizeUsername(username)}\n${addrLine}\n\nYour store location is saved for distance-based browsing.`;
      if (geo.warnings?.length) {
        preview += `\n\n${geo.warnings.join('\n\n')}`;
      }

      Alert.alert('Profile created', preview, [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/profile'),
        },
      ]);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not save profile';
      Alert.alert('Profile Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const userCoreFilled = !!displayName.trim() && !!normalizeUsername(username);

  const storeAddressValidation = validateUsStoreAddressFormat({
    address_line1: addressLine1,
    city,
    region,
    postal_code: postalCode,
  });

  const storeCoreFilled =
    !!displayName.trim() &&
    !!normalizeUsername(username) &&
    storeAddressValidation.ok;

  const coreFilled =
    accountKind === 'user'
      ? userCoreFilled
      : accountKind === 'store'
        ? storeCoreFilled
        : false;

  const saveDisabled =
    isLoading ||
    !coreFilled ||
    usernameCheck !== 'ok' ||
    onboardingSubphase !== 'form' ||
    !accountKind;

  // Disable save while there's an address-level validation error (e.g. partial geocode match)
  const effectiveSaveDisabled = saveDisabled || !!addressError;

  const headerTitle =
    phase === 'signIn' ? 'Sign in' : 'Complete your profile';

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

  const fieldErr = (empty: boolean) =>
    showValidation && empty ? styles.inputError : undefined;

  useEffect(() => {
    setAddressError(null);
  }, [addressLine1, city, region, postalCode]);

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
        {phase === 'signIn' ? (
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {headerTitle}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {phase === 'signIn' ? (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Sign in with Google
            </Text>
            <Text
              style={{
                color: colors.text,
                marginBottom: 16,
                fontSize: 13,
                opacity: 0.8,
                fontFamily: Fonts.sans,
              }}
            >
              Continue with your Google account to create or access your
              Buyinz profile.
            </Text>

            <Pressable
              style={[styles.socialBtn, { borderColor: colors.border }]}
              onPress={handleGoogleAuth}
              disabled={isLoading}
            >
              <Ionicons
                name="logo-google"
                size={20}
                color={colors.text}
                style={{ marginRight: 8 }}
              />
              {isLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.socialBtnText, { color: colors.text }]}>
                  Continue with Google
                </Text>
              )}
            </Pressable>
          </View>
        ) : onboardingSubphase === 'chooseType' ? (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Join Buyinz as
            </Text>
            <Text
              style={{
                color: colors.text,
                marginBottom: 16,
                fontSize: 13,
                opacity: 0.85,
                fontFamily: Fonts.sans,
              }}
            >
              Choose how you will use the app. You can change this on the next
              screen before saving.
            </Text>
            {oauthEmail ? (
              <Text
                style={{
                  color: colors.text,
                  marginBottom: 16,
                  fontSize: 13,
                  opacity: 0.85,
                  fontFamily: Fonts.sans,
                }}
              >
                Signed in as {oauthEmail}
              </Text>
            ) : null}

            <Pressable
              style={[styles.choiceBtn, { borderColor: colors.border }]}
              onPress={() => pickAccountKind('user')}
            >
              <Ionicons name="person-outline" size={22} color={colors.text} />
              <Text style={[styles.choiceBtnTitle, { color: colors.text }]}>
                Shopper
              </Text>
              <Text
                style={[styles.choiceBtnSub, { color: colors.tabIconDefault }]}
              >
                Browse and buy from local thrift listings
              </Text>
            </Pressable>

            <Pressable
              style={[styles.choiceBtn, { borderColor: colors.border }]}
              onPress={() => pickAccountKind('store')}
            >
              <Ionicons name="storefront-outline" size={22} color={colors.text} />
              <Text style={[styles.choiceBtnTitle, { color: colors.text }]}>
                Thrift store
              </Text>
              <Text
                style={[styles.choiceBtnSub, { color: colors.tabIconDefault }]}
              >
                List inventory and connect with local shoppers
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Profile details
            </Text>
            {oauthEmail ? (
              <Text
                style={{
                  color: colors.text,
                  marginBottom: 16,
                  fontSize: 13,
                  opacity: 0.85,
                  fontFamily: Fonts.sans,
                }}
              >
                Signed in as {oauthEmail}
              </Text>
            ) : null}

            <View style={styles.segmentRow}>
              <Pressable
                style={[
                  styles.segmentBtn,
                  accountKind === 'user' && { backgroundColor: colors.tint, borderColor: colors.tint },
                  { borderColor: colors.border },
                ]}
                onPress={() => switchAccountKind('user')}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: accountKind === 'user' ? '#fff' : colors.text },
                  ]}
                >
                  Shopper
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentBtn,
                  accountKind === 'store' && { backgroundColor: colors.tint, borderColor: colors.tint },
                  { borderColor: colors.border },
                ]}
                onPress={() => switchAccountKind('store')}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: accountKind === 'store' ? '#fff' : colors.text },
                  ]}
                >
                  Store
                </Text>
              </Pressable>
            </View>
            <Text
              style={[
                styles.switchHint,
                { color: colors.tabIconDefault },
              ]}
            >
              Switching clears address fields that do not apply to the other
              profile type.
            </Text>

            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: avatarUrl }}
                style={[styles.avatar, { borderColor: colors.border }]}
              />
              <Pressable style={styles.changePhotoBtn} onPress={handleImagePick}>
                <Text style={[styles.changePhotoText, { color: colors.tint }]}>Change Profile Photo</Text>
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
                fieldErr(!displayName.trim()),
              ]}
              placeholder={
                accountKind === 'store'
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
                fieldErr(!normalizeUsername(username)),
              ]}
              placeholder="Username / handle (Required)"
              placeholderTextColor={colors.tabIconDefault}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameHint()}

            {accountKind === 'user' ? null : (
              <>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                    fieldErr(!addressLine1.trim()),
                    !storeAddressValidation.ok && (showValidation || addressLine1 || city || region || postalCode) ? styles.inputError : undefined,
                  ]}
                  placeholder="Street address (Required)"
                  placeholderTextColor={colors.tabIconDefault}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                    fieldErr(!city.trim()),
                    !storeAddressValidation.ok && (showValidation || addressLine1 || city || region || postalCode) ? styles.inputError : undefined,
                  ]}
                  placeholder="City (Required)"
                  placeholderTextColor={colors.tabIconDefault}
                  value={city}
                  onChangeText={setCity}
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                    fieldErr(!region.trim()),
                    !storeAddressValidation.ok && (showValidation || addressLine1 || city || region || postalCode) ? styles.inputError : undefined,
                  ]}
                  placeholder="State (2 letters, e.g. PA)"
                  placeholderTextColor={colors.tabIconDefault}
                  value={region}
                  onChangeText={setRegion}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                    fieldErr(!postalCode.trim()),
                    !storeAddressValidation.ok && (showValidation || addressLine1 || city || region || postalCode) ? styles.inputError : undefined,
                  ]}
                  placeholder="ZIP (5 digits or ZIP+4)"
                  placeholderTextColor={colors.tabIconDefault}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                />
                {/* Inline address validation message */}
                {((!storeAddressValidation.ok && (showValidation || addressLine1 || city || region || postalCode)) || addressError) ? (
                  <Text style={[styles.hint, { color: '#ef4444' }]}> 
                    {addressError ?? (!storeAddressValidation.ok ? storeAddressValidation.message : null)}
                  </Text>
                ) : null}
              </>
            )}

            {accountKind === 'store' ? (
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
                effectiveSaveDisabled && styles.primaryBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={effectiveSaveDisabled}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {accountKind === 'store'
                    ? 'Save and Verify Profile'
                    : 'Save profile'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: Fonts.serif,
  },
  hint: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
    fontFamily: Fonts.sans,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Fonts.sans,
  },
  choiceBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  choiceBtnTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
    fontFamily: Fonts.serif,
  },
  choiceBtnSub: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: Fonts.sans,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentBtnText: {
    fontWeight: '700',
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
  switchHint: {
    fontSize: 12,
    marginBottom: 16,
    opacity: 0.9,
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  inputError: {
    borderColor: '#ef4444',
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
});
