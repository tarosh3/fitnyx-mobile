import { X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DietLog } from '@/src/lib/api/diet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { SLOT_LABELS } from '../model';
import { MacroLine } from '../ui/bits';

/** Food logged outside the plan (search, quick add), each removable. */
export function OtherLogs({ logs, onRemove }: { logs: DietLog[]; onRemove: (log: DietLog) => void }) {
  const c = useThemeColors();
  if (!logs.length) return null;
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {logs.map((l, i) => (
        <View key={l.client_log_id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
          <View style={styles.body}>
            <Text style={[styles.slot, { color: c.mutedText }]}>{SLOT_LABELS[l.slot]}{l.created_at ? '' : ' · waiting to sync'}</Text>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{l.name}</Text>
            {l.items.length > 1 ? (
              <Text style={[styles.items, { color: c.mutedText }]} numberOfLines={2}>
                {l.items.map((it) => (it.qty === 1 ? it.name : `${it.qty} × ${it.name}`)).join(', ')}
              </Text>
            ) : null}
            <MacroLine kcal={l.kcal} protein={l.protein_g} carbs={l.carbs_g} fat={l.fat_g} />
          </View>
          <Pressable onPress={() => onRemove(l)} accessibilityRole="button" accessibilityLabel={`Remove ${l.name}`}
            style={({ pressed }) => [styles.remove, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
            <X size={18} color={c.mutedText} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingLeft: spacing.base, paddingRight: spacing.md },
  body: { flex: 1, minWidth: 0, gap: 2 },
  slot: { fontFamily: type.weight.semibold, fontSize: 12 },
  name: { fontFamily: type.weight.bold, fontSize: 15 },
  items: { fontFamily: type.weight.regular, fontSize: 13 },
  remove: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
