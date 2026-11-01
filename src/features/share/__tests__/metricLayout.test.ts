import { metricLayout } from '../cards/metricLayout';
import { NUMERAL_GLYPHS } from '../cards/numeralGeometry';

describe('export-safe numeric ink bounds', () => {
  it.each([
    ['240', 'kg'],
    ['1,234,567', 'kg'],
    ['12:34:56', ''],
    ['5:29', '/km'],
    ['0.00', 'km'],
  ])('keeps %s %s inside the padded viewport', (value, unit) => {
    const layout = metricLayout(value, unit, 84, 280)!;
    const [left, top, width, height] = layout.viewBox.split(' ').map(Number);
    expect(layout.width).toBeLessThanOrEqual(280);
    expect(layout.height).toBeGreaterThan(0);
    layout.glyphs.forEach((glyph, i) => {
      const char = (value + unit)[i];
      const bounds = NUMERAL_GLYPHS[char].bounds;
      if (!glyph.path) return;
      expect(glyph.x + bounds[0] * glyph.scale).toBeGreaterThan(left);
      expect(glyph.x + bounds[2] * glyph.scale).toBeLessThan(left + width);
      expect(-bounds[3] * glyph.scale).toBeGreaterThan(top);
      expect(-bounds[1] * glyph.scale).toBeLessThan(top + height);
    });
  });
  it('fits a long duration in the narrow receipt stat column', () => {
    expect(metricLayout('12:34:56', '', 24, 74)!.width).toBeLessThanOrEqual(74);
  });
  it('falls back safely when an unsupported unit is supplied', () => {
    expect(metricLayout('12', '未知', 84, 280)).toBeNull();
  });
});
