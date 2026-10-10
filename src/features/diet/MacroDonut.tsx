import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

// Calories per gram of each macro — used to split the ring by energy share.
const KCAL = { protein: 4, carbs: 4, fats: 9 } as const;

const COLORS = { protein: '#5fc793', carbs: '#38bdf8', fats: '#f59e0b' } as const;

const SIZE = 196;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 10; // visual gap between arcs (in path units)

interface Props {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  mutedColor: string;
  trackColor: string;
  textColor: string;
}

export function MacroDonut({ calories, proteinG, carbsG, fatsG, mutedColor, trackColor, textColor }: Props) {
  const pKcal = proteinG * KCAL.protein;
  const cKcal = carbsG * KCAL.carbs;
  const fKcal = fatsG * KCAL.fats;
  const totalKcal = pKcal + cKcal + fKcal || 1;

  const segments = [
    { key: 'protein', share: pKcal / totalKcal, grams: proteinG, color: COLORS.protein },
    { key: 'carbs', share: cKcal / totalKcal, grams: carbsG, color: COLORS.carbs },
    { key: 'fats', share: fKcal / totalKcal, grams: fatsG, color: COLORS.fats },
  ];

  // Entrance: ring scales up + fades in, center number eases in just after.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [enter]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.92 + enter.value * 0.08 }],
  }));
  const centerStyle = useAnimatedStyle(() => ({ opacity: enter.value }));

  const usable = C - GAP * segments.length;
  let cursor = 0;

  return (
    <View style={styles.wrap}>
      <Animated.View style={ringStyle}>
        <Svg width={SIZE} height={SIZE}>
          {/* Track */}
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={trackColor} strokeWidth={STROKE} fill="none" />
          {/* Arcs — rotated so the first one starts at the top */}
          <G rotation={-90} originX={SIZE / 2} originY={SIZE / 2}>
            {segments.map((seg) => {
              const arc = Math.max(seg.share * usable, 0);
              const offset = -cursor;
              cursor += arc + GAP;
              return (
                <Circle
                  key={seg.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${arc} ${C - arc}`}
                  strokeDashoffset={offset}
                />
              );
            })}
          </G>
        </Svg>
        <Animated.View style={[styles.center, centerStyle]} pointerEvents="none">
          <Text style={[styles.calories, { color: textColor }]}>{calories.toLocaleString()}</Text>
          <Text style={[styles.kcal, { color: mutedColor }]}>KCAL / DAY</Text>
        </Animated.View>
      </Animated.View>

      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <LegendRow key={seg.key} seg={seg} delay={200 + i * 90} mutedColor={mutedColor} textColor={textColor} />
        ))}
      </View>
    </View>
  );
}

// One legend row, owning its own staggered fade/slide-up entrance. Kept as a
// component (not a hook called in a .map) so the animation hooks live at a
// component top level — no Rules-of-Hooks violation if the macro set changes.
interface LegendRowProps {
  seg: { key: string; share: number; grams: number; color: string };
  delay: number;
  mutedColor: string;
  textColor: string;
}

function LegendRow({ seg, delay, mutedColor, textColor }: LegendRowProps) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 8 }],
  }));
  return (
    <Animated.View style={[styles.legendItem, style]}>
      <View style={[styles.dot, { backgroundColor: seg.color }]} />
      <Text style={[styles.legendLabel, { color: mutedColor }]}>{seg.key.toUpperCase()}</Text>
      <Text style={[styles.legendValue, { color: textColor }]}>{seg.grams}g</Text>
      <Text style={[styles.legendPct, { color: mutedColor }]}>{Math.round(seg.share * 100)}%</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 20 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  calories: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5 },
  kcal: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', gap: 8 },
  legendItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  legendValue: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  legendPct: { fontSize: 10, fontWeight: '700' },
});
