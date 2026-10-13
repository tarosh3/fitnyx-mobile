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
    /** Body-part tones for the Workouts tab: fg = icon/text, bg = soft tile. */
    parts: {
      chest: { fg: '#4FD1C5', bg: '#0F2A2C' },
      back: { fg: '#8AAEFF', bg: '#151D35' },
      legs: { fg: '#B9A0FF', bg: '#1F1631' },
      shoulders: { fg: '#F2C94C', bg: '#2A2410' },
      arms: { fg: '#FF9466', bg: '#2B1A11' },
      core: { fg: '#5fc793', bg: '#14231C' },
      cardio: { fg: '#FF7A95', bg: '#2E121A' },
    },
    /** Deep-green hero card (same feel in both themes). */
    hero: { from: '#1A6140', to: '#08180F', text: '#F2FBF6', muted: 'rgba(242,251,246,0.76)', accent: '#B8F0D3', line: 'rgba(255,255,255,0.12)' },
    gold: { from: '#FFE7A3', to: '#F2B705', text: '#5A3B00' },
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
    parts: {
      chest: { fg: '#0E7C86', bg: '#DCF1F2' },
      back: { fg: '#2F5BEA', bg: '#E4EBFD' },
      legs: { fg: '#7C3AED', bg: '#EEE7FD' },
      shoulders: { fg: '#A35E00', bg: '#FBEFD8' },
      arms: { fg: '#C2410C', bg: '#FDE8DC' },
      core: { fg: '#23734A', bg: '#E2F2E8' },
      cardio: { fg: '#BE123C', bg: '#FDE4EA' },
    },
    hero: { from: '#1E6E47', to: '#0B3522', text: '#F2FBF6', muted: 'rgba(242,251,246,0.76)', accent: '#B8F0D3', line: 'rgba(255,255,255,0.12)' },
    gold: { from: '#FFE7A3', to: '#F2B705', text: '#5A3B00' },
  },
} as const;

export type ThemeMode = keyof typeof colors;
