import { Car, CirclePause, Info, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { StatTile, UnitText } from '@/src/features/roam/components/StatTile';
import { formatDurationHuman, formatSpeed } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export interface RoamStatsPanelProps {
  movingSec: number;
  /** Start to finish, including stops. */
  elapsedSec: number;
  maxSpeedMps: number;
  /** Vehicle time also falls outside moving time, so it isn't just "stopped". */
  vehicleDetected?: boolean;
  /** Pedometer steps (runs and walks); null/omitted without them. */
  steps?: number | null;
  /** Estimated calories burned; null/omitted without a body weight. */
  kcal?: number | null;
  /** Climb from terrain data; null/omitted when unknown. */
  elevationGainM?: number | null;
  /** Average / peak heart rate (bpm) from the health store; null/omitted without it. */
  avgHR?: number | null;
  maxHR?: number | null;
}

/** Secondary metrics sit below the route; distance, time and average speed live in the overview. */
export function RoamStatsPanel(p: RoamStatsPanelProps) {
  const palette = useThemeColors();
  const [explain, setExplain] = useState(false);
  const notMovingSec = Math.max(0, p.elapsedSec - p.movingSec);
  const extras = extraTiles(p);

  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.row}>
        <StatTile label="Top speed" value={formatSpeed(p.maxSpeedMps)} />
        <StatTile label="Elapsed time" value={formatDurationHuman(p.elapsedSec)} />
      </View>

      {extras.map((pair) => pair.length === 1 ? (
        <View key={pair[0].label} style={styles.singleMetric}>
          <Text style={[styles.singleLabel, { color: palette.mutedText }]}>{pair[0].label}</Text>
          <UnitText value={pair[0].value} color={palette.text} size={20} />
        </View>
      ) : (
        <View key={pair[0].label} style={styles.row}>
          {pair.map((t) => (
            <StatTile key={t.label} label={t.label} value={t.value} />
          ))}
        </View>
      ))}

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <View style={styles.metas}>
          {notMovingSec >= 5 ? (
            <Meta
              icon={p.vehicleDetected ? Car : CirclePause}
              text={`${formatDurationHuman(notMovingSec)} ${p.vehicleDetected ? 'not counted' : 'stopped'}`}
            />
          ) : null}
        </View>
        <Pressable
          onPress={() => setExplain((v) => !v)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="What do these stats mean?"
          accessibilityState={{ expanded: explain }}
          style={[styles.infoBtn, explain && { backgroundColor: palette.surface }]}
        >
          <Info size={16} color={explain ? palette.accent : palette.mutedText} />
        </Pressable>
      </View>

      {explain ? (
        <View style={[styles.explainer, { backgroundColor: palette.surface }]}>
          <Explain term="Top speed" text="your fastest few seconds, from the GPS's own speed reading." />
          {p.steps ? <Explain term="Cadence" text="steps per minute while moving." /> : null}
          <Explain
            term="Moving time"
            text={p.vehicleDetected ? 'excludes stops and vehicle travel.' : 'excludes stops, so they never lower your average speed.'}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Calories, steps, cadence and elevation gain when known, two tiles per row. */
function extraTiles(p: RoamStatsPanelProps): { label: string; value: string }[][] {
  const tiles: { label: string; value: string }[] = [];
  if (p.kcal) tiles.push({ label: 'Calories', value: `${p.kcal.toLocaleString('en-IN')} kcal` });
  if (p.steps) {
    tiles.push({ label: 'Steps', value: p.steps.toLocaleString('en-IN') });
    if (p.movingSec >= 60) tiles.push({ label: 'Cadence', value: `${Math.round(p.steps / (p.movingSec / 60))} spm` });
  }
  if (p.elevationGainM != null) tiles.push({ label: 'Elevation gain', value: `${Math.round(p.elevationGainM)} m` });
  if (p.avgHR) tiles.push({ label: 'Avg HR', value: `${p.avgHR} bpm` });
  if (p.maxHR) tiles.push({ label: 'Max HR', value: `${p.maxHR} bpm` });
  const rows: { label: string; value: string }[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
  return rows;
}

function Meta({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  const palette = useThemeColors();
  return (
    <View style={styles.meta}>
      <Icon size={14} color={palette.mutedText} />
      <Text style={[styles.metaText, { color: palette.mutedText }]}>{text}</Text>
    </View>
  );
}

function Explain({ term, text }: { term: string; text: string }) {
  const palette = useThemeColors();
  return (
    <Text style={[styles.explainText, { color: palette.mutedText }]}>
      <Text style={{ color: palette.text, fontFamily: type.weight.bold }}>{term}:</Text> {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingTop: 16, paddingHorizontal: 8, paddingBottom: 6 },
  row: { flexDirection: 'row', paddingVertical: 4 },
  singleMetric: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginHorizontal: 16, paddingVertical: 12 },
  singleLabel: { flexShrink: 1, fontFamily: type.weight.medium, fontSize: 14 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    marginHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  metas: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12.5, fontFamily: type.weight.semibold, fontVariant: ['tabular-nums'] },
  infoBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  explainer: { borderRadius: 12, padding: 12, gap: 6, marginHorizontal: 8, marginTop: 8, marginBottom: 6 },
  explainText: { fontSize: 12.5, lineHeight: 18 },
});
