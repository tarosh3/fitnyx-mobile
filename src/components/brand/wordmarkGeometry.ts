/**
 * FitNyx signature lettering — original vector outlines, not a system font.
 * 48-unit cap height, 10-degree forward lean, cut terminals and a split X.
 * Keep this as the source of truth for the component and distributable SVGs.
 */
export const WORDMARK_WIDTH = 284;
export const WORDMARK_HEIGHT = 56;
export const WORDMARK_TRANSFORM = 'matrix(1 0 -0.18 1 11 0)';

export const WORDMARK_GLYPHS = [
  { letter: 'F', x: 0, width: 41, path: 'M2 4H39L35 14H14V24H33L29 34H14V52H2Z' },
  { letter: 'I', x: 47, width: 14, path: 'M0 4H12V52H0Z' },
  { letter: 'T', x: 66, width: 46, path: 'M4 4H46L42 14H29V52H17V14H0Z' },
  { letter: 'N', x: 116, width: 45, path: 'M0 4H12L33 33V4H45V52H33L12 23V52H0Z' },
  { letter: 'Y', x: 167, width: 50, path: 'M0 4H13L25 24L37 4H50L31 35V52H19V35Z' },
  {
    letter: 'X',
    x: 220,
    width: 55,
    path: 'M0 4H14L22 19L14 29Z M31 34L38 24L55 52H41Z',
    accentPath: 'M35 4H49L14 52H0Z',
  },
] as const;
