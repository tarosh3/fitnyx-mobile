import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text } from 'react-native-svg';
import { PRO_SPARK_PATH } from '@/src/features/pro/ProIcon';
import { share } from '@/src/theme/colors';

/** An original membership pass crossing a rising running track. No raster assets. */
export function ProDoodle() {
  const p = share.night;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 190" accessible={false}>
      <Defs>
        <LinearGradient id="pro-pass" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={p.panel} /><Stop offset="1" stopColor={share.sketch.mint} /></LinearGradient>
      </Defs>
      <G fill="none" stroke={p.faint} strokeWidth="1.2">
        {[0, 12, 24, 36, 48].map(n => <Path key={n} d={`M-25 ${150+n}C60 ${150+n} 48 ${36+n} 144 ${36+n}S253 ${141+n} 390 ${9+n}`} />)}
      </G>
      <Path d="M-25 174C60 174 48 60 144 60S253 165 390 33" fill="none" stroke={p.accent} strokeWidth="1.6" />
      <G transform="translate(84 24) rotate(-10 96 65)">
        <Rect x="5" y="8" width="202" height="132" rx="16" fill={p.ink} stroke={p.faint} />
        <Rect width="202" height="132" rx="16" fill="url(#pro-pass)" />
        <Path d="M16 99H186" stroke={p.panelMuted} strokeWidth="0.8" strokeDasharray="3 4" />
        <Text x="17" y="25" fontFamily="Inter_700Bold" fontSize="9" letterSpacing="2" fill={p.ink}>FITNYX / MEMBERSHIP</Text>
        <Text x="15" y="86" fontFamily="Anton_400Regular" fontSize="56" letterSpacing="-1" fill={p.ink}>PRO</Text>
        <G transform="translate(132 33) scale(.85)"><Path d={PRO_SPARK_PATH} fill={p.ink} fillRule="evenodd" /></G>
        <Text x="17" y="118" fontFamily="Inter_600SemiBold" fontSize="8" letterSpacing="1.5" fill={p.ink}>MORE POSSIBILITY. ALL YOU.</Text>
      </G>
      <Circle cx="40" cy="125" r="5" fill={p.accent} stroke={p.bg} strokeWidth="3" />
      <Path d="M308 39L312 49L323 53L312 57L308 68L304 57L294 53L304 49Z" fill={share.sketch.yellow} />
      <Path d="M52 38L61 33M61 47L68 45M285 159L292 165" stroke={p.muted} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
