import { Check, Flame, Footprints, Route } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatGoal, GOAL_META, goalFraction, goalValue, type ActivityGoal, type DayActivity, type GoalKind } from '@/src/features/goals/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

export const GOAL_ICONS: Record<GoalKind, typeof Route> = { distance: Route, burn: Flame, steps: Footprints };

/** A progress ring with content in the middle. */
export function GoalRing({ fraction, color, track, size = 72, stroke = 7, children }: {
  fraction: number; color: string; track: string; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {fraction > 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - fraction)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/** One ring per set goal: icon inside, "3.2 / 5 km" under it. */
export function GoalRingsRow({ goals, day, size = 72 }: { goals: ActivityGoal[]; day: DayActivity; size?: number }) {
  const c = useThemeColors();
  return (
    <View style={styles.row}>
      {goals.map(({ kind, target }) => {
        const value = goalValue(kind, day);
        const done = value >= target;
        const color = c.goals[kind];
        const Icon = done ? Check : GOAL_ICONS[kind];
        return (
          <View key={kind} style={styles.item} accessible accessibilityRole="progressbar"
            accessibilityLabel={`${GOAL_META[kind].label}: ${formatGoal(kind, value)} of ${formatGoal(kind, target)}${done ? ', goal reached' : ''}`}
            accessibilityValue={{ min: 0, max: target, now: Math.min(value, target) }}>
            <GoalRing fraction={goalFraction(target, value)} color={color} track={c.goals.track} size={size}>
              <Icon size={size * 0.3} color={color} strokeWidth={done ? 3 : 2} />
            </GoalRing>
            <Text style={[styles.value, { color: c.text }]} numberOfLines={1}>
              {formatGoal(kind, value, false)}
              <Text style={[styles.target, { color: c.mutedText }]}> / {formatGoal(kind, target, kind !== 'steps')}</Text>
            </Text>
            <Text style={[styles.label, { color: c.mutedText }]}>{GOAL_META[kind].label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  item: { flex: 1, alignItems: 'center', gap: 4, minWidth: 0 },
  value: { fontFamily: type.weight.extrabold, fontSize: 15, fontVariant: ['tabular-nums'], marginTop: 4 },
  target: { fontFamily: type.weight.medium, fontSize: 12 },
  label: { fontFamily: type.weight.medium, fontSize: 12 },
});
