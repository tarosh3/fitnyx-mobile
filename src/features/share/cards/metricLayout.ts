import { NUMERAL_EM, NUMERAL_GLYPHS } from './numeralGeometry';

/** Lay out real glyph outlines and fit their combined ink bounds, including the unit. */
export function metricLayout(value: string, unit: string, size: number, maxWidth: number, unitScale = 0.27) {
  let x = 0;
  const glyphs: { path: string; x: number; scale: number; unit: boolean }[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [text, isUnit] of [
    [value, false],
    [unit, true],
  ] as const) {
    if (isUnit && text) x += size * 0.08;
    const scale = (size * (isUnit ? unitScale : 1)) / NUMERAL_EM;
    for (const char of text) {
      const glyph = NUMERAL_GLYPHS[char];
      if (!glyph) return null;
      glyphs.push({ path: glyph.path, x, scale, unit: isUnit });
      if (glyph.path) {
        minX = Math.min(minX, x + glyph.bounds[0] * scale);
        maxX = Math.max(maxX, x + glyph.bounds[2] * scale);
        minY = Math.min(minY, glyph.bounds[1] * scale);
        maxY = Math.max(maxY, glyph.bounds[3] * scale);
      }
      x += glyph.advance * scale;
    }
  }
  if (!Number.isFinite(minX)) return null;
  const pad = 2;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;
  const fit = Math.min(1, maxWidth / width);
  return { glyphs, viewBox: `${minX - pad} ${-maxY - pad} ${width} ${height}`, width: width * fit, height: height * fit };
}
