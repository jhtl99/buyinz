import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[colorScheme ?? 'light'];

  const customTheme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      primary: palette.tint,
    },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={customTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="user" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-profile"
            options={{
              headerShown: false,
              presentation: 'modal',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="listing/[id]"
            options={{
              headerShown: true,
              title: 'Listing',
            }}
          />
          <Stack.Screen
            name="create-listing"
            options={{
              presentation: 'modal',
              title: 'New Listing',
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
