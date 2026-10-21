import { useRouter } from 'expo-router';
import { Crown, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ArenaBoard } from '@/src/lib/api/arena';
import { radii, spacing, type } from '@/src/styles/tokens';
import { BOARD_ACTION, formatScore, heroRank, nextUp } from '../model';

/**
 * The one thing the Arena is about: your rank. Big number left, your score
 * right, then what moves you up — the gap to the next person, or what earns
 * points when you have none. On Global it also holds the opt-in.
 */
export function ArenaHero({ board, saving, onListedChange }: {
  board: ArenaBoard; saving: boolean; onListedChange: (value: boolean) => void;
}) {
  const c = useThemeColors();
  const router = useRouter();
  const { rank, label, ranked } = heroRank(board);
  const mine = formatScore(board.board, board.me.score);
  const gap = ranked ? nextUp(board.rows, board.board) : null;
  const leading = gap === 'You’re leading';
  const needsPoints = board.me.score <= 0;
  const action = BOARD_ACTION[board.board];

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.top} accessible accessibilityLabel={`${ranked ? `Rank ${rank}, ` : ''}${label}. Your score ${mine.value} ${mine.unit}.`}>
        {/* Unranked, the words are the headline — a 52pt dash reads as a broken bar. */}
        <View style={styles.rankCol}>
          {ranked ? <Text testID="arena-rank" style={[styles.rank, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{rank}</Text> : null}
          <Text testID="arena-standing" style={ranked ? [styles.rankLabel, { color: c.mutedText }] : [styles.unranked, { color: c.text }]} numberOfLines={2}>{label}</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[styles.score, { color: board.me.score > 0 ? c.text : c.mutedText }]} numberOfLines={1}>{mine.value}</Text>
          <Text style={[styles.unit, { color: c.mutedText }]}>{mine.unit}</Text>
        </View>
      </View>

      {gap ? (
        <View style={[styles.gap, { borderTopColor: c.border }]}>
          {leading ? <Crown size={18} color={c.gold.to} /> : <TrendingUp size={18} color={c.accent} />}
          <Text style={[styles.gapText, { color: c.text }]}>{gap}</Text>
        </View>
      ) : null}

      {/* Shown whether or not the user is on Global, so joining doesn't move the switch under their finger. */}
      {needsPoints ? (
        <Button testID="arena-action" title={action.label} onPress={() => router.push(action.href as never)} style={styles.action} />
      ) : null}

      {board.scope === 'global' ? (
        <View style={[styles.optIn, { borderTopColor: c.border }]}>
          <View style={styles.optInText}>
            <Text style={[styles.optInTitle, { color: c.text }]}>Show me on Global</Text>
            <Text style={[styles.optInSub, { color: c.mutedText }]}>
              {board.me.listed ? 'Others see your username, photo and score.' : 'You can watch without being listed.'}
            </Text>
          </View>
          <Switch testID="arena-optin" value={board.me.listed} disabled={saving} onValueChange={onListedChange}
            accessibilityLabel="Show me on Global leaderboards" trackColor={{ true: c.primary, false: c.border }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  rankCol: { flex: 1, gap: 2 },
  rank: { fontFamily: type.weight.extrabold, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  rankLabel: { fontFamily: type.weight.medium, fontSize: 14 },
  unranked: { fontFamily: type.weight.extrabold, fontSize: 22, letterSpacing: -0.3 },
  scoreCol: { alignItems: 'flex-end', paddingBottom: 2 },
  score: { fontFamily: type.weight.extrabold, fontSize: 26, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.semibold, fontSize: 13 },
  gap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  gapText: { flex: 1, fontFamily: type.weight.semibold, fontSize: 15 },
  action: { flexGrow: 0 },
  optIn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  optInText: { flex: 1, gap: 2 },
  optInTitle: { fontFamily: type.weight.semibold, fontSize: 15 },
  optInSub: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
});
