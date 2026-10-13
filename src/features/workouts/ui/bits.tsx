import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { type Part, partLabel } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Coloured body-part label ("Chest", "Cardio"). */
export function PartChip({ part }: { part: Part }) {
  const c = useThemeColors();
  const tone = c.parts[part];
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.chipText, { color: tone.fg }]}>{partLabel(part)}</Text>
    </View>
  );
}

/** Neutral pill (counts, equipment). */
export function Pill({ children, tone }: { children: React.ReactNode; tone?: 'ok' | 'gold' }) {
  const c = useThemeColors();
  const bg = tone === 'ok' ? c.accentSoft : tone === 'gold' ? c.parts.shoulders.bg : c.surface;
  const fg = tone === 'ok' ? c.accent : tone === 'gold' ? c.parts.shoulders.fg : c.mutedText;
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: c.border, borderWidth: tone ? 0 : StyleSheet.hairlineWidth }]}>
      {typeof children === 'string' ? <Text style={[styles.chipText, { color: fg }]}>{children}</Text> : children}
    </View>
  );
}

interface RingSpec {
  value: number;
  goal: number;
  color: string;
}

/** Concentric progress rings (outer first), Apple-Fitness style. */
export function Rings({ rings, size = 112, stroke = 11 }: { rings: RingSpec[]; size?: number; stroke?: number }) {
  const c0 = size / 2;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rings.map((r, i) => {
        const radius = c0 - stroke / 2 - i * (stroke + 3);
        const circ = 2 * Math.PI * radius;
        const f = Math.max(0, Math.min(1, r.goal > 0 ? r.value / r.goal : 0));
        return (
          <React.Fragment key={i}>
            <Circle cx={c0} cy={c0} r={radius} stroke={r.color} strokeOpacity={0.18} strokeWidth={stroke} fill="none" />
            {f > 0 ? (
              <Circle
                cx={c0} cy={c0} r={radius} stroke={r.color} strokeWidth={stroke} fill="none" strokeLinecap="round"
                strokeDasharray={`${circ * f} ${circ}`} rotation={-90} origin={`${c0}, ${c0}`}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/** Section title row with an optional right-hand action. */
export function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={styles.head}>
      <Text style={[styles.headText, { color: c.text }]} accessibilityRole="header">{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontFamily: type.weight.semibold, fontSize: 13 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 44 },
  headText: { fontFamily: type.weight.extrabold, fontSize: 21, letterSpacing: -0.3 },
});
