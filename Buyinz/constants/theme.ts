import { Platform } from 'react-native';

export const Brand = {
  primary: '#0BCCB8',
  primaryDark: '#099E8E',
  gradientStart: '#0BCCB8',
  gradientEnd: '#098CB3',
};

export const ConditionColors = {
  New: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  'Like New': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  Good: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  Fair: { bg: 'rgba(244, 63, 94, 0.15)', text: '#F43F5E', border: 'rgba(244, 63, 94, 0.3)' },
} as const;

export const Colors = {
  light: {
    text: '#1A1D2E',
    textSecondary: '#71788A',
    background: '#F7F7F7',
    card: '#FFFFFF',
    border: '#E0E2EA',
    muted: '#ECEEF2',
    tint: Brand.primary,
    icon: '#71788A',
    tabIconDefault: '#71788A',
    tabIconSelected: Brand.primary,
    isoBg: '#ECFDF9',
    isoBorder: Brand.primary,
    rose: '#F43F5E',
    roseBg: 'rgba(244, 63, 94, 0.1)',
  },
  dark: {
    text: '#ECF0F5',
    textSecondary: '#7C859C',
    background: '#12141C',
    card: '#1C1F2A',
    border: '#2C3040',
    muted: '#262938',
    tint: '#FFFFFF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
    isoBg: '#172625',
    isoBorder: Brand.primary,
    rose: '#FB7185',
    roseBg: 'rgba(251, 113, 133, 0.1)',
  },
};

export type ThemeColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'Georgia',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
