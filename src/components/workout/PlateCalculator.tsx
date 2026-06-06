import { X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type as t } from '@/src/styles/tokens';

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLOR: Record<number, string> = {
  25: '#EF4444',
  20: '#3B82F6',
  15: '#F59E0B',
  10: '#22C55E',
  5: '#E5E5E5',
  2.5: '#A1A1AA',
  1.25: '#71717A',
};
const BAR_OPTIONS = [20, 15, 10, 0];

function computePlates(target: number, bar: number): { plate: number; count: number }[] {
  let perSide = (target - bar) / 2;
  if (!Number.isFinite(perSide) || perSide <= 0) return [];
  const out: { plate: number; count: number }[] = [];
  for (const p of PLATES) {
    const count = Math.floor(perSide / p + 1e-9);
    if (count > 0) {
      out.push({ plate: p, count });
      perSide -= count * p;
    }
  }
  return out;
}

interface Props {
  visible: boolean;
  weightKg: number;
  onClose: () => void;
}

export function PlateCalculator({ visible, weightKg, onClose }: Props) {
  const c = useThemeColors();
  const [bar, setBar] = useState(20);

  const plates = useMemo(() => computePlates(weightKg, bar), [weightKg, bar]);
  const loaded = bar + plates.reduce((s, p) => s + p.plate * p.count * 2, 0);
  const remainder = Math.round((weightKg - loaded) * 100) / 100;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: c.mutedText }]}>PLATE CALCULATOR</Text>
              <Text style={[styles.weight, { color: c.text }]}>{weightKg} kg</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
              <X size={18} color={c.text} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: c.mutedText }]}>BAR</Text>
          <View style={styles.barRow}>
            {BAR_OPTIONS.map((b) => {
              const active = bar === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => setBar(b)}
                  style={[styles.barChip, { backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }]}
                >
                  <Text style={[styles.barChipText, { color: active ? c.primaryText : c.mutedText }]}>
                    {b === 0 ? 'None' : `${b}kg`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: c.mutedText }]}>PER SIDE</Text>
          {plates.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedText }]}>
              {weightKg <= bar ? 'Just the bar.' : 'Below bar weight.'}
            </Text>
          ) : (
            <View style={styles.plateList}>
              {plates.map((p) => (
                <View key={p.plate} style={[styles.plateRow, { borderColor: c.border }]}>
                  <View style={[styles.plateDot, { backgroundColor: PLATE_COLOR[p.plate] }]} />
                  <Text style={[styles.plateText, { color: c.text }]}>
                    {p.count} × {p.plate} kg
                  </Text>
                </View>
              ))}
            </View>
          )}

          {remainder > 0 ? (
            <Text style={[styles.remainder, { color: c.warning }]}>
              {remainder} kg not loadable with standard plates
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: t.weight.semibold, fontSize: t.size.xs, letterSpacing: t.tracking.eyebrow },
  weight: { fontFamily: t.weight.extrabold, fontSize: 32, letterSpacing: t.tracking.tight, marginTop: 2 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    marginTop: spacing.xs,
  },
  barRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  barChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barChipText: { fontFamily: t.weight.bold, fontSize: t.size.sm },
  plateList: { gap: spacing.sm },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  plateDot: { width: 14, height: 14, borderRadius: 7 },
  plateText: { fontFamily: t.weight.bold, fontSize: t.size.body },
  empty: { fontFamily: t.weight.regular, fontSize: t.size.sm },
  remainder: { fontFamily: t.weight.semibold, fontSize: t.size.xs },
});
