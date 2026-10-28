import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Flag, Compass, CalendarCheck, Crown, Flame, Infinity as InfinityIcon, Mountain, Layers, Gem, Timer, Star } from 'lucide-react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const symbols: Record<string, typeof Star> = {
  'first-workout': Flag, 'first-roam': Compass, 'workouts-25': CalendarCheck,
  'workouts-100': Crown, 'streak-4': Flame, 'streak-12': InfinityIcon,
  'km-100': Mountain, 'tonnes-10': Layers, 'lift-100': Gem, 'sub-25-5k': Timer,
};
export function MilestoneEmblem({ id, earned, size = 72 }: { id: string; earned: boolean; size?: number }) {
  const c = useThemeColors();
  const Icon = symbols[id] ?? Star;
  const ink = earned ? '#91E7BA' : c.mutedText;
  return <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox="0 0 80 80" style={StyleSheet.absoluteFill}>
      <Path d="M40 3 69 17v32L56 68 40 77 24 68 11 49V17Z" fill={earned ? '#143F2D' : c.surface} stroke={earned ? '#5FC793' : c.mutedText} strokeOpacity={earned ? 1 : 0.5} strokeWidth={2} />
      <Path d="M40 10 63 22v25L51 62 40 69 29 62 17 47V22Z" fill="none" stroke={ink} strokeWidth={0.8} opacity={earned ? 0.6 : 0.4} />
      {earned ? <><Path d="m40 5 2 4-2 4-2-4ZM14 46l3 4-3 4-3-4Zm52 0 3 4-3 4-3-4Z" fill="#F3CE7D" /><Circle cx="40" cy="64" r="2" fill="#F3CE7D" /></> : null}
    </Svg>
    <Icon size={size * 0.4} color={ink} strokeWidth={1.8} style={{ marginTop: -size * 0.07, opacity: earned ? 1 : 0.8 }} />
  </View>;
}
