import { Text, View, StyleSheet } from 'react-native';

import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  count: number;
  /** Feed card: show the word "New" when count > 0 */
  variant: 'feedNew' | 'countToday';
  /** Tighter padding for feed header */
  compact?: boolean;
};

export function NewItemsTodayBadge({ count, variant, compact }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  if (count <= 0) return null;

  const label =
    variant === 'feedNew' ? 'New' : `${count} new today`;

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        {
          borderColor: Brand.primary,
          backgroundColor: scheme === 'dark' ? 'rgba(11, 204, 184, 0.18)' : 'rgba(11, 204, 184, 0.14)',
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  wrapCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
