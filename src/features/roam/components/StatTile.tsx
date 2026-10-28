import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  label: string;
  value: string;
  /** The live/summary hero metric. */
  big?: boolean;
  /** Brand colour for the value (e.g. XP). */
  accent?: boolean;
}

// "4:54 /km" → [4:54][ /km], "28m 6s" → [28][m ][6][s]: digits carry the
// weight, units are smaller and muted, so the number is what the eye reads.
const TOKEN = /([+-]?\d[\d:.,]*)|([^\d+-]+|[+-])/g;

function splitValue(value: string): { text: string; unit: boolean }[] {
  const parts: { text: string; unit: boolean }[] = [];
  for (const m of value.matchAll(TOKEN)) parts.push({ text: m[0], unit: m[1] === undefined });
  // Placeholders like "--:--" or "—" have no digits: show them as a value.
  return parts.some((p) => !p.unit) ? parts : [{ text: value, unit: false }];
}

/** A metric value with muted, smaller units — e.g. a split's pace. */
export function UnitText({ value, color, size = 14 }: { value: string; color: string; size?: number }) {
  const palette = useThemeColors();
  return (
    <Text style={{ color, fontSize: size, fontFamily: type.weight.extrabold, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
      {splitValue(value).map((p, i) =>
        p.unit ? (
          <Text key={i} style={{ color: palette.mutedText, fontSize: Math.round(size * 0.72), fontFamily: type.weight.semibold }}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}

/** One labelled metric (distance, time, pace…). */
export function StatTile({ label, value, big = false, accent = false }: Props) {
  const palette = useThemeColors();
  const valueColor = accent ? palette.primary : palette.text;
  return (
    // flex:1 shares a row equally; the big hero tile stacks in a column, where
    // flex:1 with no parent height collapses it to 0 — so it sizes to content.
    <View style={[styles.tile, big && styles.stacked]}>
      <Text style={[big ? styles.big : styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {splitValue(value).map((p, i) =>
          p.unit ? (
            <Text key={i} style={[big ? styles.bigUnit : styles.unit, { color: accent ? palette.primary : palette.mutedText }]}>
              {p.text}
            </Text>
          ) : (
            p.text
          ),
        )}
      </Text>
      <Text style={[styles.label, { color: palette.mutedText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  stacked: { flex: 0 },
  value: { fontSize: 24, fontFamily: type.weight.extrabold, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  unit: { fontSize: 14, fontFamily: type.weight.semibold, letterSpacing: 0 },
  big: { fontSize: 52, fontFamily: type.weight.extrabold, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  bigUnit: { fontSize: 22, fontFamily: type.weight.bold, letterSpacing: 0 },
  label: { fontSize: type.size.micro, fontFamily: type.weight.bold, letterSpacing: 1.2, marginTop: 4, textTransform: 'uppercase' },
});
