import { fmtWeight, limitDecimals } from '../decimal';

it('keeps at most 2 decimals and one dot', () => {
  expect(limitDecimals('72.456')).toBe('72.45');
  expect(limitDecimals('7.2.3')).toBe('7.23');
  expect(limitDecimals('72,5')).toBe('72.5');
  expect(limitDecimals('72.')).toBe('72.');
  expect(limitDecimals('.5')).toBe('.5');
  expect(limitDecimals('abc72kg')).toBe('72');
  expect(limitDecimals('12345')).toBe('123');
  expect(limitDecimals('72.4', 1)).toBe('72.4');
  expect(limitDecimals('72.45', 0)).toBe('72');
});

it('formats weights with up to 2 decimals', () => {
  expect(fmtWeight(72.456)).toBe('72.46');
  expect(fmtWeight(72.5)).toBe('72.5');
  expect(fmtWeight(72)).toBe('72');
  expect(fmtWeight(1.25)).toBe('1.25');
});
