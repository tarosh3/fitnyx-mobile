import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShareRow } from '@/src/features/share/cardData';
import { type } from '@/src/styles/tokens';

/** Exercises with their best set, records flagged — the middle of a workout card. */
export function RowList({ rows, text, muted, accent, rule }: { rows: ShareRow[]; text: string; muted: string; accent: string; rule: string }) {
  return (
    <View style={styles.list}>
      {rows.map((r, i) => (
        <View key={`${r.name}-${i}`} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: rule }]}>
          <Text style={[styles.name, { color: text }]} numberOfLines={1}>
            {r.name}
          </Text>
          {r.pr ? (
            <View style={[styles.pr, { borderColor: accent }]}>
              <Text style={[styles.prText, { color: accent }]}>PR</Text>
            </View>
          ) : null}
          <Text style={[styles.detail, { color: muted }]} numberOfLines={1}>
            {r.detail}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  name: { flex: 1, fontFamily: type.weight.bold, fontSize: 14 },
  detail: { fontFamily: type.weight.medium, fontSize: 13, fontVariant: ['tabular-nums'] },
  pr: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  prText: { fontFamily: type.weight.extrabold, fontSize: 9.5, letterSpacing: 0.8 },
  highlight: { fontFamily: type.weight.bold, fontSize: 12.5, letterSpacing: 0.3, marginTop: 10, textAlign: 'center' },
});

/** One line under the bars: the first record, else the biggest exercise. */
export function Highlight({ rows, color }: { rows: ShareRow[]; color: string }) {
  const top = rows.find((r) => r.pr) ?? rows[0];
  if (!top) return null;
  return (
    <Text style={[styles.highlight, { color }]} numberOfLines={1}>
      {`${top.pr ? 'PR  ·  ' : ''}${top.name}  ·  ${top.detail}`}
    </Text>
  );
}
