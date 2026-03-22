export const Colors = {
  light: {
    text: '#4B4B4B',
    background: '#FFFFFF',
    primary: '#58CC02',
    primaryDark: '#46A302',
    secondary: '#1CB0F6',
    secondaryDark: '#1899D6',
    accent: '#FFC800',
    accentDark: '#E5B800',
    error: '#FF4B4B',
    errorDark: '#EA2B2B',
    purple: '#CE82FF',
    purpleDark: '#B060E0',
    correct: '#58CC02',
    border: '#E5E5E5',
    card: '#F7F7F7',
    muted: '#AFAFAF',
  },
  dark: {
    text: '#FFFFFF',
    background: '#131F24',
    primary: '#58CC02',
    primaryDark: '#46A302',
    secondary: '#1CB0F6',
    secondaryDark: '#1899D6',
    accent: '#FFC800',
    accentDark: '#E5B800',
    error: '#FF4B4B',
    errorDark: '#EA2B2B',
    purple: '#CE82FF',
    purpleDark: '#B060E0',
    correct: '#58CC02',
    border: '#3C4D54',
    card: '#1B2C33',
    muted: '#778D96',
  },
} as const;

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Font = {
  h1: { fontSize: 28, fontWeight: '800' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const, color: '#AFAFAF' },
} as const;
