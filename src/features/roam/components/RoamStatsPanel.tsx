import { Car, CirclePause, Info, Timer, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { StatTile } from '@/src/features/roam/components/StatTile';
import { formatDistance, formatDurationHuman, formatSpeed } from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export interface RoamStatsPanelProps {
  distanceM: number;
  movingSec: number;
  /** Start to finish, including stops. */
  elapsedSec: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  /** Vehicle time also falls outside moving time, so it isn't just "stopped". */
  vehicleDetected?: boolean;
  /** Earned XP once saved; omitted on the pre-save review (the server decides it). */
  xp?: { earned: number; eligible: boolean };
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

/**
 * The metrics of one Roam, shared by the post-run review and the saved Roam.
 * Hero distance, a 2×2 grid (speed in km/h for every Roam type), and a quiet
 * footer for the time breakdown. The "what does this
 * mean" copy sits behind the info button instead of always taking space.
 */
export function RoamStatsPanel(p: RoamStatsPanelProps) {
  const palette = useThemeColors();
  const [explain, setExplain] = useState(false);
  const notMovingSec = Math.max(0, p.elapsedSec - p.movingSec);
  const extras = extraTiles(p);

  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <StatTile big label="Distance" value={formatDistance(p.distanceM)} />
      <View style={[styles.rule, { backgroundColor: palette.border }]} />
      <View style={styles.row}>
        <StatTile label="Moving time" value={formatDurationHuman(p.movingSec)} />
        <StatTile label="Avg speed" value={formatSpeed(p.avgSpeedMps)} />
      </View>
      <View style={styles.row}>
        <StatTile label="Top speed" value={formatSpeed(p.maxSpeedMps)} />
        {p.xp ? (
          <StatTile label="XP earned" value={p.xp.eligible ? `+${p.xp.earned}` : '—'} accent={p.xp.eligible} />
        ) : (
          <StatTile label="Elapsed" value={formatDurationHuman(p.elapsedSec)} />
        )}
      </View>

      {extras.map((pair) => (
        <View key={pair[0].label} style={styles.row}>
          {pair.map((t) => (
            <StatTile key={t.label} label={t.label} value={t.value} />
          ))}
          {pair.length === 1 ? <View style={styles.spacer} /> : null}
        </View>
      ))}

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <View style={styles.metas}>
          {/* Without an XP tile, elapsed already has its own tile. */}
          {p.xp ? <Meta icon={Timer} text={`${formatDurationHuman(p.elapsedSec)} total`} /> : null}
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
          style={[styles.infoBtn, explain && { backgroundColor: palette.surface }]}
        >
          <Info size={16} color={explain ? palette.primary : palette.mutedText} />
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
  panel: { borderRadius: 20, borderWidth: 1, paddingTop: 16, paddingHorizontal: 8, paddingBottom: 6 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginTop: 10, marginBottom: 8 },
  row: { flexDirection: 'row', paddingVertical: 4 },
  spacer: { flex: 1 },
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
  infoBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  explainer: { borderRadius: 12, padding: 12, gap: 6, marginHorizontal: 8, marginTop: 8, marginBottom: 6 },
  explainText: { fontSize: 12.5, lineHeight: 18 },
});
