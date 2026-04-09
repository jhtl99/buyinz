import { Brand, Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  checkUsernameAvailable,
  fetchBuyinzUserRowByAuthId,
  normalizeUsername,
  saveProfile,
  validateProfileUpdate,
} from '@/lib/supabase';
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

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);

  const [isLoading, setIsLoading] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>('idle');
  const [hydrated, setHydrated] = useState(false);

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
        setDisplayName(row?.display_name ?? user.display_name);
        setUsername(row?.username ?? user.username);
        setLocation(row?.location ?? user.location);
        setBio(row?.bio ?? user.bio ?? '');
        setAvatarUrl(row?.avatar_url ?? user.avatar_url ?? DEFAULT_AVATAR);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      const profilePayload = {
        id: user.id,
        display_name: displayName,
        username,
        location,
        bio,
        avatar_url: avatarUrl,
      };

      validateProfileUpdate(profilePayload);

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

  const coreFilled =
    !!displayName.trim() &&
    !!normalizeUsername(username) &&
    !!location.trim();

  const saveDisabled = isLoading || !coreFilled || usernameCheck !== 'ok';

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
        <ActivityIndicator size="large" color={Brand.primary} />
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
            { backgroundColor: scheme === 'light' ? '#f5f5f5' : '#1c1c1e' },
          ]}
        >
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
              <Text style={styles.primaryBtnText}>Update Your Profile</Text>
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
