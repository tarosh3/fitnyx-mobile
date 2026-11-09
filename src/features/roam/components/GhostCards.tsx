import { Ghost, Trophy } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shortDate } from '@/src/features/roam/components/RacePicker';
import { formatDistance } from '@/src/features/roam/geo';
import { formatGap, RACE_WARMUP_M, type RaceState } from '@/src/features/roam/ghost';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

interface Ghostly {
  title: string;
  startedAt: string;
}

/** Live: how far ahead of (or behind) the ghost you are right now. */
export function GhostLiveCard({ ghost, state }: { ghost: Ghostly; state: RaceState }) {
  const c = useThemeColors();
  const vs = `vs ${ghost.title}, ${shortDate(ghost.startedAt)}`;
  let big: string;
  let sub: string;
  let tone: string = c.text;
  if (state.kind === 'warmup') {
    big = 'Ready';
    sub = `${vs} · gap shows after ${RACE_WARMUP_M} m`;
  } else if (state.kind === 'done') {
    const won = state.marginSec >= 0;
    big = won ? `Won by ${formatGap(state.marginSec)}` : `${formatGap(state.marginSec)} slower`;
    sub = `Past its finish · ${vs}`;
    tone = won ? c.accent : c.warning;
  } else {
    const ahead = Math.round(state.aheadSec) >= 0;
    big = `${formatGap(state.aheadSec)} ${ahead ? 'ahead' : 'behind'}`;
    sub = `${formatDistance(Math.abs(state.aheadM))} ${state.aheadM >= 0 ? 'in front' : 'back'} · ${vs}`;
    tone = ahead ? c.accent : c.warning;
  }
  return (
    <View style={[styles.live, { backgroundColor: c.card, borderColor: c.border }]} accessibilityLiveRegion="polite" testID="ghost-live">
      <Ghost size={22} color={tone} />
      <View style={styles.text}>
        <Text style={[styles.big, { color: tone }]} numberOfLines={1}>{big}</Text>
        <Text style={[styles.sub, { color: c.mutedText }]} numberOfLines={1}>{sub}</Text>
      </View>
    </View>
  );
}

/** After the Roam: how the race went. `ghostDistanceM` says how short a stop fell. */
export function RaceResultCard({ ghost, ghostDistanceM, state, myDistanceM }: { ghost: Ghostly; ghostDistanceM: number; state: RaceState; myDistanceM: number }) {
  const c = useThemeColors();
  const name = `${ghost.title} (${shortDate(ghost.startedAt)})`;
  let title: string;
  let body: string;
  let won = false;
  if (state.kind === 'done') {
    won = state.marginSec >= 0;
    title = Math.round(state.marginSec) === 0 ? 'Dead heat with your ghost' : won ? `You beat your ghost by ${formatGap(state.marginSec)}` : `Your ghost won by ${formatGap(state.marginSec)}`;
    body = `Racing ${name} over ${formatDistance(ghostDistanceM)}.`;
  } else {
    title = 'Race not finished';
    const left = `You stopped ${formatDistance(Math.max(0, ghostDistanceM - myDistanceM))} before its finish`;
    body = state.kind === 'racing'
      ? `${left}, ${formatGap(state.aheadSec)} ${Math.round(state.aheadSec) >= 0 ? 'ahead' : 'behind'} at that point. Racing ${name}.`
      : `${left}. Racing ${name}.`;
  }
  const Icon = won ? Trophy : Ghost;
  return (
    <View style={[styles.result, { backgroundColor: c.card, borderColor: won ? c.primary : c.border }]} testID="race-result">
      <Icon size={22} color={won ? c.accent : c.mutedText} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 18, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  result: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: 18, borderWidth: 1, padding: spacing.lg },
  text: { flex: 1, gap: 2 },
  big: { fontFamily: type.weight.extrabold, fontSize: 22, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: type.weight.medium, fontSize: 12 },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19 },
});
