import React from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { metricLayout } from './metricLayout';

/** Vector numerals have identical, unclipped ink on iOS, Android and exported PNGs. */
export function MetricNumber({
  value,
  unit = '',
  size,
  maxWidth = 280,
  color,
  unitColor = color,
  centered,
  shadow,
  unitScale = 0.27,
}: {
  value: string;
  unit?: string;
  size: number;
  maxWidth?: number;
  color: string;
  unitColor?: string;
  unitScale?: number;
  centered?: boolean;
  shadow?: TextStyle;
}) {
  const layout = metricLayout(value, unit, size, maxWidth, unitScale);
  return (
    <View
      style={{
        height: size * 1.16,
        justifyContent: 'center',
        alignItems: centered ? 'center' : 'flex-start',
        alignSelf: 'stretch',
      }}
    >
      {layout ? (
        <Svg
          width={layout.width}
          height={layout.height}
          viewBox={layout.viewBox}
          accessible
          accessibilityLabel={`${value}${unit ? ` ${unit}` : ''}`}
          accessibilityRole="text"
        >
          <G transform="scale(1,-1)">
            {shadow
              ? layout.glyphs.map((glyph, i) => (
                  <Path
                    key={`outline-${i}`}
                    d={glyph.path}
                    transform={`translate(${glyph.x},0) scale(${glyph.scale})`}
                    fill={shadow.textShadowColor}
                    stroke={shadow.textShadowColor}
                    strokeWidth={1.4 / glyph.scale}
                    strokeLinejoin="round"
                  />
                ))
              : null}
            {layout.glyphs.map((glyph, i) => (
              <Path
                key={i}
                d={glyph.path}
                transform={`translate(${glyph.x},0) scale(${glyph.scale})`}
                fill={glyph.unit ? unitColor : color}
              />
            ))}
          </G>
        </Svg>
      ) : (
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ color, fontSize: size, fontFamily: 'Anton_400Regular', paddingVertical: 4 }}
        >
          {value}
          {unit ? ` ${unit}` : ''}
        </Text>
      )}
    </View>
  );
}
