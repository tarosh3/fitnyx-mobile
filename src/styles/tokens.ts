// Design tokens — single source for spacing, radii, shadows, motion, typography.
// Import via: import { spacing, radii, motion, type } from '@/src/styles/tokens';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  pill: 999,
} as const;

export const type = {
  // font families wired via expo-font loaders in _layout.tsx
  display: { fontFamily: 'Anton_400Regular' },
  // sizes (lineHeight derived ~1.3x for body, 1.15x for headings)
  size: {
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    sm: 14,
    xs: 12,
    micro: 10,
  },
  weight: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },
  // letter spacing for eyebrow / uppercase labels
  tracking: {
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    eyebrow: 1.6,
  },
} as const;

export const motion = {
  duration: {
    fast: 150,
    base: 220,
    slow: 360,
  },
  spring: {
    soft: { damping: 18, stiffness: 180, mass: 1 },
    snappy: { damping: 14, stiffness: 220, mass: 0.9 },
    bouncy: { damping: 10, stiffness: 160, mass: 1 },
  },
  press: {
    scaleFrom: 1,
    scaleTo: 0.96,
  },
} as const;

export const elevation = {
  // soft shadows tuned for dark UI; iOS uses shadow*, Android uses elevation
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const hitSlop = {
  sm: { top: 6, bottom: 6, left: 6, right: 6 },
  md: { top: 10, bottom: 10, left: 10, right: 10 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;
