import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();
  const signedIn = !!user;

  const hiddenWhenLoggedOut = signedIn ? {} : { href: null };

  // Sell tab: cannot combine `href` (e.g. href: null) with custom `tabBarButton` — Expo Router throws.
  const sellTabOptions = signedIn
    ? {
        title: '',
        tabBarButton: () => (
          <Pressable
            style={styles.sellButtonOuter}
            onPress={() => router.push('/create-listing')}
          >
            <View style={styles.sellButtonCircle}>
              <Ionicons name="add" size={28} color="#FFF" />
            </View>
          </Pressable>
        ),
      }
    : { href: null };

  return (
    <Tabs
      initialRouteName={signedIn ? 'index' : 'profile'}
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1C1F2A' : '#FFFFFF',
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          ...hiddenWhenLoggedOut,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          ...hiddenWhenLoggedOut,
        }}
      />
      <Tabs.Screen name="sell" options={sellTabOptions} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sellButtonOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 2,
  },
});
