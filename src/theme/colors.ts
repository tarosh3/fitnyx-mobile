/**
 * Share cards — fixed art direction, the same in both themes (a card shared
 * from dark mode must look like one shared from light mode).
 */
export const share = {
  /** Fixed print palettes: exported cards never depend on the app's theme. */
  night: { bg: '#101C18', text: '#F4F5EA', muted: '#AEBFB5', faint: '#35453D', accent: '#C5F5A6', panel: '#C5F5A6', ink: '#14251B', panelMuted: '#40583E' },
  route: ['#14251B', '#14251B', '#14251B'],
  paper: { bg: '#F4F1E8', ink: '#20271F', muted: '#62685E', faint: '#D4D7CB', accent: '#316844', routeA: '#316844', routeB: '#316844' },
  receipt: { paper: '#F4F1E8', ink: '#20271F', muted: '#62685E', rule: '#CCD1C4' },
  photo: { scrim: 'rgba(6,16,11,0.94)', clear: 'rgba(6,16,11,0)', text: '#FFFFFF', muted: '#E0E7DD', placeholderA: '#344D3C', placeholderB: '#101C18' },
  sticker: { text: '#FFFFFF', muted: '#FFFFFF', shadow: 'rgba(0,0,0,0.6)', checkA: '#35473D', checkB: '#2A3A31' },
} as const;

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
    nav: {
      surface: '#1B1B1B', edge: '#303030', shadow: '#000000',
      inactive: '#A1A1AA', iconFill: '#292929', active: '#5FC793', activeFill: '#20382B',
      coachInk: '#E4E4E7', coachFill: '#353535', coachLens: '#282828',
    },
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
    /** Diet: macro colours (differ in lightness too), veg marks, meal-slot tiles. */
    diet: {
      protein: '#5fc793', carbs: '#8AAEFF', fat: '#F2C94C', track: '#262626',
      veg: '#4ADE80', nonVeg: '#FB923C', over: '#F59E0B', water: '#8AAEFF',
      hero: '#102419', plate: '#141414',
      slots: {
        breakfast: { fg: '#F2C94C', bg: '#2A2410' },
        lunch: { fg: '#5fc793', bg: '#14231C' },
        snack: { fg: '#FF7A95', bg: '#2E121A' },
        dinner: { fg: '#8AAEFF', bg: '#151D35' },
      },
    },
    /** Deep-green hero card (same feel in both themes). */
    hero: { from: '#1A6140', to: '#08180F', text: '#F2FBF6', muted: 'rgba(242,251,246,0.76)', accent: '#B8F0D3', line: 'rgba(255,255,255,0.12)' },
    gold: { from: '#FFE7A3', to: '#F2B705', text: '#5A3B00' },
    /** Progress tab: lifting vs Roam series, records, and the activity calendar (rest → big day). */
    progress: {
      lift: '#5fc793', roam: '#F2A65A', roamSoft: 'rgba(242,166,90,0.16)', liftSoft: '#14231C',
      record: '#F2C14E', recordSoft: 'rgba(242,193,78,0.14)', empty: '#262626',
      heat: ['#1B1F1C', '#24503A', '#2F7A52', '#7FE0AE'], heatInk: ['#A1A1AA', '#F5F5F5', '#F5F5F5', '#0C0C0C'],
    },
    /** Daily goal rings: Roam distance, calories burned, steps. */
    goals: { distance: '#6F95FF', burn: '#FF7A45', steps: '#5fc793', track: '#262626' },
    share,
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
    nav: {
      surface: '#FFFFFF', edge: '#E4E4E7', shadow: '#000000',
      inactive: '#62626B', iconFill: '#F1F1F3', active: '#23734A', activeFill: '#E5F2EA',
      coachInk: '#27272A', coachFill: '#E4E4E7', coachLens: '#F1F1F3',
    },
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
    diet: {
      protein: '#23734A', carbs: '#2F5BEA', fat: '#A35E00', track: '#E9E9EC',
      veg: '#15803D', nonVeg: '#9A3412', over: '#B45309', water: '#2F5BEA',
      hero: '#DDEFE3', plate: '#FFFFFF',
      slots: {
        breakfast: { fg: '#A35E00', bg: '#FFF1DA' },
        lunch: { fg: '#23734A', bg: '#E3F3EA' },
        snack: { fg: '#BE123C', bg: '#FDE4EA' },
        dinner: { fg: '#2F5BEA', bg: '#E4EBFD' },
      },
    },
    hero: { from: '#1E6E47', to: '#0B3522', text: '#F2FBF6', muted: 'rgba(242,251,246,0.76)', accent: '#B8F0D3', line: 'rgba(255,255,255,0.12)' },
    gold: { from: '#FFE7A3', to: '#F2B705', text: '#5A3B00' },
    progress: {
      lift: '#2E9E68', roam: '#D9741C', roamSoft: 'rgba(217,116,28,0.12)', liftSoft: '#E2F2E8',
      record: '#A36A00', recordSoft: 'rgba(242,183,5,0.16)', empty: '#E4E4E7',
      heat: ['#ECEDEE', '#BFE5CF', '#5FB98A', '#1E6E47'], heatInk: ['#52525B', '#103724', '#0B2A1A', '#F2FBF6'],
    },
    goals: { distance: '#2F5BEA', burn: '#D9480F', steps: '#23734A', track: '#E9E9EC' },
    share,
  },
} as const;

export type ThemeMode = keyof typeof colors;
