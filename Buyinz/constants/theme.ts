import { Platform } from 'react-native';

export const Brand = {
  // Website-aligned editorial palette
  paper: '#F9F5ED',
  ink: '#0D0D0D',
  gold: '#E8AB3E',
  brick: '#9D3629',
  primary: '#9D3629',
  primaryDark: '#7C271F',
  gradientStart: '#9D3629',
  gradientEnd: '#E8AB3E',
};

export const Colors = {
  light: {
    text: Brand.ink,
    textSecondary: '#6F655B',
    background: Brand.paper,
    card: '#FFFDF9',
    border: '#DED3C5',
    muted: '#EFE4D5',
    tint: Brand.brick,
    icon: '#7D7266',
    tabIconDefault: '#7D7266',
    tabIconSelected: Brand.brick,
    isoBg: 'rgba(157, 54, 41, 0.08)',
    isoBorder: Brand.brick,
    rose: '#F43F5E',
    roseBg: 'rgba(244, 63, 94, 0.1)',
  },
  dark: {
    text: '#F5EEE5',
    textSecondary: '#B8A99B',
    background: '#171311',
    card: '#221B18',
    border: '#3D302A',
    muted: '#2F2622',
    tint: Brand.gold,
    icon: '#B8A99B',
    tabIconDefault: '#B8A99B',
    tabIconSelected: Brand.gold,
    isoBg: 'rgba(157, 54, 41, 0.14)',
    isoBorder: Brand.gold,
    rose: '#FB7185',
    roseBg: 'rgba(251, 113, 133, 0.1)',
  },
};

export type ThemeColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'Arial Rounded MT Bold',
    mono: 'Menlo',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Fraunces, Georgia, 'Times New Roman', serif",
    rounded: "Inter, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
