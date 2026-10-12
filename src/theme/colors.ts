export const colors = {
  dark: {
    background: '#0A0A0A',
    surface: '#141414',
    card: '#1B1B1B',
    border: '#2A2A2A',
    text: '#F5F5F5',
    mutedText: '#A1A1AA',
    primary: '#5fc793',
    primaryText: '#0C0C0C',
    /** Green for text and icons on the page background (primary is too light on white). */
    accent: '#5fc793',
    /** Green-tinted surface, e.g. the coach card. */
    accentSoft: '#14231C',
    /** Route colour by speed, slow → fast (Roam replay). */
    routeRamp: ['#4F7CFF', '#22C3D6', '#5fc793', '#F2C94C', '#FF7A45'],
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
    primary: '#5fc793',
    primaryText: '#111111',
    accent: '#23734A',
    accentSoft: '#E5F2EA',
    routeRamp: ['#2F5BEA', '#0E9FB5', '#2E9E68', '#E0A800', '#F0582A'],
    destructive: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
} as const;

export type ThemeMode = keyof typeof colors;
