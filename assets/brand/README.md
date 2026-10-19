# FitNyx signature wordmark

Custom, outlined FITNYX lettering with a forward lean, angled F/T terminals and a split X. The ascending X stroke is the optional color accent. It is a fixed wordmark for the brand name, not an installable alphabet font.

## Use

- In the app, use `FitNyxWordmark` from `src/components/brand/FitNyxWordmark.tsx`.
- Use `fitnyx-wordmark.svg` on light backgrounds and `fitnyx-wordmark-light.svg` on dark backgrounds.
- Use `fitnyx-wordmark-mono.svg` for single-color applications; it inherits `currentColor` (black by default). In design software, set its fills to the intended ink color.
- Use the mark at 18 logical pixels high or larger. Leave at least half the mark's height as clear space around it.
- Preserve the proportions, custom spacing and split X. Do not retype it with a similar font or add an unrelated icon to the lettering.
- Existing Inter body typography and Anton display headings remain the companion fonts.

The source outlines are in `src/components/brand/wordmarkGeometry.ts`. After changing the outlines, run `node scripts/export-brand-wordmark.cjs` to regenerate the SVG masters.
