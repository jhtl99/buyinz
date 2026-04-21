import { Text, View, StyleSheet } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
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
          borderColor: colors.tint,
          backgroundColor: scheme === 'dark' ? 'rgba(232, 171, 62, 0.20)' : 'rgba(157, 54, 41, 0.12)',
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
    fontFamily: Fonts.sans,
  },
});
