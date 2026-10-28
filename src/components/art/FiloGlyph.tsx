import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** Optical reduction of the illustrated seed character for 24–44px surfaces. */
export function FiloGlyph({ size = 28, color = '#5FC793', ink = '#103D2C' }: { size?: number; color?: string; ink?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
    <Path d="M16 9C8 9 4 15 4 21c0 6 5 9 12 9s12-3 12-9c0-6-4-12-12-12Z" fill={color} />
    <Path d="M16 10C9 10 9 5 10 2c1 4 9 1 10 5 0 2-2 3-4 3Z" fill={color} />
    <Circle cx="11" cy="19" r="1.7" fill={ink} /><Circle cx="21" cy="19" r="1.7" fill={ink} />
    <Path d="M12 24q4 4 8 0" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
  </Svg>;
}
