import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Brand } from '@/constants/theme';
import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  const customTheme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      primary: Brand.primary,
    },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={customTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-profile" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen
            name="create-listing"
            options={{
              presentation: 'modal',
              title: 'New Listing',
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
