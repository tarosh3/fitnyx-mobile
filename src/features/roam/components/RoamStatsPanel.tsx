import { Car, CirclePause, Info, Timer, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatTile } from '@/src/features/roam/components/StatTile';
import {
  formatDistance,
  formatDurationHuman,
  formatPace,
  formatSpeed,
  type ActivityType,
} from '@/src/features/roam/geo';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export interface RoamStatsPanelProps {
  type: ActivityType;
  distanceM: number;
  movingSec: number;
  /** Start to finish, including stops. */
  elapsedSec: number;
  avgPaceSecPerKm: number | null;
  avgSpeedMps: number;
  maxSpeedMps: number;
  /** Vehicle time also falls outside moving time, so it isn't just "stopped". */
  vehicleDetected?: boolean;
  /** Earned XP once saved; omitted on the pre-save review (the server decides it). */
  xp?: { earned: number; eligible: boolean };
}

/**
 * The metrics of one Roam, shared by the post-run review and the saved Roam.
 * Hero distance, a 2×2 grid in one unit family (pace on foot, speed on a
 * bike), and a quiet footer for the time breakdown. The "what does this
 * mean" copy sits behind the info button instead of always taking space.
 */
export function RoamStatsPanel(p: RoamStatsPanelProps) {
  const palette = useThemeColors();
  const [explain, setExplain] = useState(false);
  const cycle = p.type === 'cycle';
  const fastestPace = p.maxSpeedMps > 0 ? 1000 / p.maxSpeedMps : null;
  const notMovingSec = Math.max(0, p.elapsedSec - p.movingSec);

  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <StatTile big label="Distance" value={formatDistance(p.distanceM)} />
      <View style={[styles.rule, { backgroundColor: palette.border }]} />
      <View style={styles.row}>
        <StatTile label="Moving time" value={formatDurationHuman(p.movingSec)} />
        <StatTile
          label={cycle ? 'Avg speed' : 'Avg pace'}
          value={cycle ? formatSpeed(p.avgSpeedMps) : formatPace(p.avgPaceSecPerKm)}
        />
      </View>
      <View style={styles.row}>
        <StatTile
          label={cycle ? 'Top speed' : 'Fastest pace'}
          value={cycle ? formatSpeed(p.maxSpeedMps) : formatPace(fastestPace)}
        />
        {p.xp ? (
          <StatTile label="XP earned" value={p.xp.eligible ? `+${p.xp.earned}` : '—'} accent={p.xp.eligible} />
        ) : (
          <StatTile label="Elapsed" value={formatDurationHuman(p.elapsedSec)} />
        )}
      </View>

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
          {!cycle ? <Explain term="Pace" text="minutes per km. Lower is faster." /> : null}
          <Explain term={cycle ? 'Top speed' : 'Fastest'} text="your quickest 10 seconds." />
          <Explain
            term="Moving time"
            text={p.vehicleDetected ? 'excludes stops and vehicle travel.' : 'excludes stops, so they never slow your pace.'}
          />
        </View>
      ) : null}
    </View>
  );
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
      <Text style={{ color: palette.text, fontWeight: '700' }}>{term}:</Text> {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, borderWidth: 1, paddingTop: 16, paddingHorizontal: 8, paddingBottom: 6 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginTop: 10, marginBottom: 8 },
  row: { flexDirection: 'row', paddingVertical: 4 },
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
  metaText: { fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  infoBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  explainer: { borderRadius: 12, padding: 12, gap: 6, marginHorizontal: 8, marginTop: 8, marginBottom: 6 },
  explainText: { fontSize: 12.5, lineHeight: 18 },
});
