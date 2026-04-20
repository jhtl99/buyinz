import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

export default function SellScreen() {
  const { user } = useAuth();

  if (user?.account_type !== 'store') {
    return <Redirect href="/(tabs)/profile" />;
  }

  return <Redirect href="/create-listing" />;
}
