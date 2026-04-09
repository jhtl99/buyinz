import { Brand, Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  authenticateWithGoogle,
  checkUsernameAvailable,
  fetchBuyinzUserRowByAuthId,
  isProfileOnboardingComplete,
  normalizeUsername,
  saveProfile,
  supabase,
  validateOnboardingSave,
} from '@/lib/supabase';
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

type UsernameCheck = 'idle' | 'checking' | 'ok' | 'taken' | 'error';

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

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

  const [isLoading, setIsLoading] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>('idle');

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
    setDisplayName('');
    setUsername('');
    setLocation('');
    setBio('');
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
    if (phase !== 'onboarding') {
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
  }, [username, phase]);

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

      const profilePayload = {
        id: authUser.id,
        display_name: displayName,
        username,
        location,
        bio,
        avatar_url: avatarUrl,
      };

      validateOnboardingSave(profilePayload);

      const u = normalizeUsername(username);
      if (!u) {
        throw new Error('Please choose a username.');
      }
      const available = await checkUsernameAvailable(u);
      if (!available) {
        throw new Error('This username is already taken.');
      }

      await saveProfile(profilePayload);
      allowLeaveRef.current = true;
      setUser({ ...profilePayload, email });

      Alert.alert(
        'Success',
        'Verification complete and Profile created successfully!',
      );
      router.replace('/(tabs)/profile');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not save profile';
      Alert.alert('Profile Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const coreFilled =
    !!displayName.trim() &&
    !!normalizeUsername(username) &&
    !!location.trim();

  const saveDisabled =
    isLoading || !coreFilled || usernameCheck !== 'ok';

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
              { backgroundColor: scheme === 'light' ? '#f5f5f5' : '#1c1c1e' },
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
        ) : (
          <View
            style={[
              styles.section,
              { backgroundColor: scheme === 'light' ? '#f5f5f5' : '#1c1c1e' },
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
                }}
              >
                Signed in as {oauthEmail}
              </Text>
            ) : null}

            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: avatarUrl }}
                style={[styles.avatar, { borderColor: colors.border }]}
              />
              <Pressable style={styles.changePhotoBtn} onPress={handleImagePick}>
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Name (Required)"
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
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Zip Code (Required)"
              placeholderTextColor={colors.tabIconDefault}
              value={location}
              onChangeText={setLocation}
              keyboardType="numeric"
            />
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

            <Pressable
              style={[
                styles.primaryBtn,
                { marginTop: 16 },
                saveDisabled && styles.primaryBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saveDisabled}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Save and Verify Profile
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
  },
  hint: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
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
    color: Brand.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    backgroundColor: Brand.primary,
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
  },
});
