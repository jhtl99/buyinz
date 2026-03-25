import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveProfile, authenticate, authenticateWithGoogle } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

// Required for web browser session handling
WebBrowser.maybeCompleteAuthSession();

export default function CreateProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();

  // Auth fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1517841905240-472988babdf9');
  const [isLoading, setIsLoading] = useState(false);

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true, // we might need this if we don't handle Supabase storage directly yet
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      // For now, simpler to just use the base64 or local URI as placeholder until we implement Supabase Storage Upload
      setAvatarUrl(asset.uri);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const { data, redirectUrl } = await authenticateWithGoogle();
      if (data.url) {
        // Open the Google Sign in page
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
           const parsedUrl = Linking.parse(result.url);
           
           // Supabase PKCE flow typically passes code in query params
           const code = parsedUrl.queryParams?.code;
           
           if (code && typeof code === 'string') {
             const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
             if (error) throw error;
             
             if (sessionData.user) {
               // Prefill the form with Google data
               setDisplayName(sessionData.user.user_metadata?.full_name || '');
               setUsername(sessionData.user.email?.split('@')[0] || '');
               setAvatarUrl(sessionData.user.user_metadata?.avatar_url || avatarUrl);
               
               // We also need to set email so handleSave successfully passes validation
               setEmail(sessionData.user.email || '');

               // We temporarily set user in context so we can pull their ID on the final save
               setUser({
                 id: sessionData.user.id,
                 display_name: sessionData.user.user_metadata?.full_name || '',
                 username: sessionData.user.email?.split('@')[0] || '',
                 location: '', 
                 avatar_url: sessionData.user.user_metadata?.avatar_url || avatarUrl
               });
               Alert.alert('Google Auth', 'Successfully signed in! Please complete your zip code and press Save to verify profile.');
             }
           } else if (result.url.includes('#access_token')) {
             // Implicit flow (fallback)
             Alert.alert('Google Auth', 'Successfully authenticated using hash tokens! Please proceed.');
           }
        }
      }
    } catch (error: any) {
      Alert.alert('Google Auth Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (!email && !phone && !user?.id) {
        throw new Error('Please provide an email or phone number to verify and establish identity.');
      }
      
      let finalUserId = user?.id;

      // 1. Authenticate and get 200 OK + unique user ID if we don't already have a Google ID
      if (!finalUserId) {
        const authRes = await authenticate(email, phone);
        finalUserId = authRes.user.id;
      }
      
      // 2. Save Profile into DB enforcing mandatory fields
      const newProfile = {
        id: finalUserId,
        display_name: displayName,
        username,
        location,
        bio,
        avatar_url: avatarUrl,
        email,
        phone
      };
      
      await saveProfile(newProfile);
      
      // 3. Set Active User into Context
      setUser(newProfile);

      Alert.alert('Success', 'Verification complete and Profile created successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Profile Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Verification Section */}
        <View style={[styles.section, { backgroundColor: scheme === 'light' ? '#f5f5f5' : '#1c1c1e' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Verification details</Text>
            <Text style={{ color: colors.text, marginBottom: 16, fontSize: 13, opacity: 0.8 }}>
              Valid phone, email, or social account needed to establish your identity.
            </Text>

            <Pressable 
              style={[styles.socialBtn, { borderColor: colors.border }]} 
              onPress={handleGoogleAuth}
            >
              <Ionicons name="logo-google" size={20} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.socialBtnText, { color: colors.text }]}>Continue with Google</Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={{ color: colors.text, opacity: 0.5, marginHorizontal: 8 }}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Email"
                placeholderTextColor={colors.tabIconDefault}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Phone Number"
                placeholderTextColor={colors.tabIconDefault}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />
        </View>

        {/* Profile Info Section */}
        <View style={[styles.section, { backgroundColor: scheme === 'light' ? '#f5f5f5' : '#1c1c1e' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Profile Details</Text>
            
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: colors.border }]} />
              <Pressable style={styles.changePhotoBtn} onPress={handleImagePick}>
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
              </Pressable>
            </View>

            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Name (Required)"
                placeholderTextColor={colors.tabIconDefault}
                value={displayName}
                onChangeText={setDisplayName}
            />
            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Username (Required)"
                placeholderTextColor={colors.tabIconDefault}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />
            <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Zip Code (Required)"
                placeholderTextColor={colors.tabIconDefault}
                value={location}
                onChangeText={setLocation}
                keyboardType="numeric"
            />
            <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="Short Bio"
                placeholderTextColor={colors.tabIconDefault}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
            />
            
            <Pressable style={[styles.primaryBtn, { marginTop: 16 }]} onPress={handleSave} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save and Verify Profile</Text>}
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
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
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  verifiedState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  }
});