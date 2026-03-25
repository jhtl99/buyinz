import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Brand } from '@/constants/theme';

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
    <ThemeProvider value={customTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
  );
}
