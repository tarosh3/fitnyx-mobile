import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

import { WORDMARK_GLYPHS, WORDMARK_HEIGHT, WORDMARK_TRANSFORM, WORDMARK_WIDTH } from './wordmarkGeometry';

interface Props {
  height?: number;
  color: string;
  /** Only the rising stroke of the X is accented. Omit for a monochrome mark. */
  accentColor?: string;
  accessible?: boolean;
}

/** Fixed custom lettering: renders identically in app UI and exported images. */
export function FitNyxWordmark({ height = 28, color, accentColor = color, accessible = true }: Props) {
  return (
    <Svg
      width={(height * WORDMARK_WIDTH) / WORDMARK_HEIGHT}
      height={height}
      viewBox={`0 0 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}`}
      accessible={accessible}
      accessibilityRole="image"
      accessibilityLabel={accessible ? 'FitNyx' : undefined}
    >
      <G transform={WORDMARK_TRANSFORM}>
        {WORDMARK_GLYPHS.map((glyph) => (
          <G key={glyph.letter} transform={`translate(${glyph.x} 0)`}>
            <Path d={glyph.path} fill={color} />
            {'accentPath' in glyph ? <Path d={glyph.accentPath} fill={accentColor} /> : null}
          </G>
        ))}
      </G>
    </Svg>
  );
}

/** One full-wordmark layer per letter preserves kerning during the splash reveal. */
export function FitNyxWordmarkLetter({ index, height, color, accentColor = color }: Omit<Props, 'accessible'> & { index: number }) {
  const glyph = WORDMARK_GLYPHS[index];
  if (!glyph) return null;
  const h = height ?? 28;
  return (
    <Svg width={(h * WORDMARK_WIDTH) / WORDMARK_HEIGHT} height={h} viewBox={`0 0 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}`} accessible={false}>
      <G transform={WORDMARK_TRANSFORM}>
        <G transform={`translate(${glyph.x} 0)`}>
          <Path d={glyph.path} fill={color} />
          {'accentPath' in glyph ? <Path d={glyph.accentPath} fill={accentColor} /> : null}
        </G>
      </G>
    </Svg>
  );
}
