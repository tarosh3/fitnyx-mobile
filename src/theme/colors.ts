export const colors = {
  dark: {
    background: '#0A0A0A',
    surface: '#141414',
    card: '#1B1B1B',
    border: '#2A2A2A',
    text: '#F5F5F5',
    mutedText: '#A1A1AA',
    primary: '#D0FD3E',
    primaryText: '#0C0C0C',
    destructive: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  light: {
    background: '#F7F7F8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E4E4E7',
    text: '#111111',
    mutedText: '#52525B',
    primary: '#C4EB31',
    primaryText: '#111111',
    destructive: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
} as const;

export type ThemeMode = keyof typeof colors;
