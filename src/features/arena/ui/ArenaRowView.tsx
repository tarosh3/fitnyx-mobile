import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ArenaBoardKind, ArenaRow } from '@/src/lib/api/arena';
import { radii, spacing, type } from '@/src/styles/tokens';
import { formatScore } from '../model';

/** One place on a board: rank, photo, name / @handle, score. The user's own row is tinted. */
export function ArenaRowView({ row, board }: { row: ArenaRow; board: ArenaBoardKind }) {
  const c = useThemeColors();
  const { value, unit } = formatScore(board, row.score);
  const title = row.me ? 'You' : row.user.name?.trim() || `@${row.user.username}`;
  const medal = row.score > 0 && row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : null;
  return (
    <View testID={row.me ? 'arena-me' : undefined} accessible
      accessibilityLabel={`Rank ${row.rank}, ${title}, ${value} ${unit}`}
      style={[styles.row, row.me && { backgroundColor: c.accentSoft }]}>
      <Text style={[styles.rank, { color: c.mutedText }]}>{medal ?? row.rank}</Text>
      <Avatar uri={row.user.avatar_url || null} name={row.user.name || row.user.username} size={40} />
      <View style={styles.who}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{title}</Text>
        {row.user.name || row.me ? <Text style={[styles.handle, { color: c.mutedText }]} numberOfLines={1}>@{row.user.username}</Text> : null}
      </View>
      <Text style={[styles.score, { color: row.score > 0 ? c.text : c.mutedText }]}>
        {value}<Text style={[styles.unit, { color: c.mutedText }]}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  rank: { width: 30, textAlign: 'center', fontFamily: type.weight.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  who: { flex: 1, gap: 2 },
  name: { fontFamily: type.weight.semibold, fontSize: 15 },
  handle: { fontFamily: type.weight.regular, fontSize: 13 },
  score: { fontFamily: type.weight.extrabold, fontSize: 16, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.semibold, fontSize: 12 },
});
