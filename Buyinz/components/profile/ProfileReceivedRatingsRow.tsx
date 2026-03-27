import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchUserRatingStats } from '@/supabase/queries';

type Props = {
  userId: string | undefined;
};

export function ProfileReceivedRatingsRow({ userId }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [receivedRatings, setReceivedRatings] = useState<{
    averageRating: number;
    ratingCount: number;
  } | null>(null);

  useEffect(() => {
    if (!userId) {
      setReceivedRatings(null);
      return;
    }

    let cancelled = false;
    setReceivedRatings(null);
    (async () => {
      try {
        const stats = await fetchUserRatingStats(userId);
        if (!cancelled) {
          setReceivedRatings(stats ?? { averageRating: 0, ratingCount: 0 });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setReceivedRatings({ averageRating: 0, ratingCount: 0 });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <View style={[styles.ratingRow, { marginTop: 10 }]}>
      {receivedRatings === null ? (
        <ActivityIndicator size="small" color={Brand.primary} />
      ) : receivedRatings.ratingCount < 1 ? (
        <Text style={[styles.noRatingsText, { color: colors.textSecondary }]}>No Ratings yet</Text>
      ) : (
        <>
          <Ionicons name="star" size={18} color="#F59E0B" />
          <Text style={[styles.ratingMain, { color: colors.text }]}>
            {receivedRatings.averageRating.toFixed(1)}
            <Text style={[styles.ratingOutOf, { color: colors.textSecondary }]}> / 5</Text>
          </Text>
          <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
            · {receivedRatings.ratingCount} {receivedRatings.ratingCount === 1 ? 'rating' : 'ratings'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 22,
  },
  noRatingsText: {
    fontSize: 15,
    fontWeight: '500',
  },
  ratingMain: {
    fontSize: 16,
    fontWeight: '800',
  },
  ratingOutOf: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 14,
    fontWeight: '500',
  },
});
