import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ArenaBoard } from '@/src/lib/api/arena';
import { radii, spacing, type } from '@/src/styles/tokens';
import { formatScore, nextUp, standing } from '../model';

/** Where the user stands, the gap to the next person, and (on Global) the opt-in switch. */
export function StandingCard({ board, saving, onListedChange }: {
  board: ArenaBoard; saving: boolean; onListedChange: (value: boolean) => void;
}) {
  const c = useThemeColors();
  const mine = formatScore(board.board, board.me.score);
  const gap = nextUp(board.rows, board.board);
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text testID="arena-standing" style={[styles.title, { color: c.text }]}>{standing(board)}</Text>
      <Text style={[styles.sub, { color: c.mutedText }]}>
        You: {mine.value} {mine.unit}{gap ? ` · ${gap}` : ''}
      </Text>
      {board.scope === 'global' ? (
        <View style={[styles.optIn, { borderTopColor: c.border }]}>
          <View style={styles.optInText}>
            <Text style={[styles.optInTitle, { color: c.text }]}>Show me on Global</Text>
            <Text style={[styles.sub, { color: c.mutedText }]}>
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
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.xs },
  title: { fontFamily: type.weight.extrabold, fontSize: 22, letterSpacing: -0.3 },
  sub: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
  optIn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  optInText: { flex: 1, gap: 2 },
  optInTitle: { fontFamily: type.weight.semibold, fontSize: 15 },
});
