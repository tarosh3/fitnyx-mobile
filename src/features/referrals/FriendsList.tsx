import { Check, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { friendLine } from '@/src/features/referrals/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ReferredBy, ReferredFriend } from '@/src/lib/api/referrals';
import { radii, spacing, type } from '@/src/styles/tokens';

function Progress({ days, needed, done }: { days: number; needed: number; done: boolean }) {
  const c = useThemeColors();
  return (
    <View style={[styles.track, { backgroundColor: c.border }]}>
      <View style={[styles.fill, { backgroundColor: c.primary, width: `${Math.round(Math.max(0, Math.min(1, done ? 1 : days / Math.max(1, needed))) * 100)}%` }]} />
    </View>
  );
}

/** Friends the user referred, with their active days. */
export function FriendsList({ friends, total, needed }: { friends: ReferredFriend[]; total: number; needed: number }) {
  const c = useThemeColors();
  return (
    <View style={styles.section} testID="referral-friends">
      <Text style={[styles.heading, { color: c.text }]}>Friends you referred{total ? ` · ${total}` : ''}</Text>
      {friends.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}><Users size={26} color={c.accent} /></View>
          <Text style={[styles.emptyTitle, { color: c.text }]}>Every crew starts with one invite.</Text>
          <Text style={[styles.emptyText, { color: c.mutedText }]}>No one yet. Share your code and they'll show up here.</Text>
        </View>
      ) : (
        <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
          {friends.map((f, i) => (
            <View key={`${f.username}-${f.joined_at}`} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
              accessible accessibilityLabel={`@${f.username}, ${friendLine(f, needed)}`}>
              <View style={styles.rowTop}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>@{f.username}</Text>
                {f.qualified ? <Check size={16} color={c.accent} /> : null}
                <Text style={[styles.line, { color: f.qualified ? c.accent : c.mutedText }]}>{friendLine(f, needed)}</Text>
              </View>
              <Progress days={f.active_days} needed={needed} done={f.qualified} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** For a referred user: who referred them and how close they are to earning that friend a Spark. */
export function ReferredByCard({ by, needed }: { by: ReferredBy; needed: number }) {
  const c = useThemeColors();
  return (
    <View style={[styles.byCard, { backgroundColor: c.card, borderColor: c.border }]} testID="referred-by">
      <Text style={[styles.byTitle, { color: c.text }]}>Referred by @{by.username || 'a friend'}</Text>
      <Text style={[styles.line, { color: c.mutedText }]}>
        {by.qualified ? `You've earned @${by.username || 'them'} a Spark. Nice.` : `Be active on ${needed} days and @${by.username || 'they'} earns a Spark: ${by.active_days} of ${needed} so far.`}
      </Text>
      <Progress days={by.active_days} needed={needed} done={by.qualified} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  heading: { fontFamily: type.weight.semibold, fontSize: 17 },
  emptyIcon: { width: 54, height: 54, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { fontFamily: type.weight.bold, fontSize: 17, lineHeight: 24, textAlign: 'center' },
  empty: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  list: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  row: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm },
  rowTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  name: { flexGrow: 1, flexShrink: 1, minWidth: 80, fontFamily: type.weight.semibold, fontSize: 15 },
  line: { fontFamily: type.weight.medium, fontSize: 12, lineHeight: 18 },
  track: { height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radii.pill },
  byCard: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  byTitle: { fontFamily: type.weight.bold, fontSize: 16 },
});
