import { Stack } from 'expo-router';

/**
 * Hide the default stack header so each user profile screen matches the Profile tab
 * (custom header only — avoids double safe-area / double header offset).
 */
export default function UserLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
