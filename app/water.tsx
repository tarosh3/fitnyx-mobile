import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Droplet, Minus, Plus, Settings2, Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BarChart } from 'react-native-gifted-charts';

import { Button } from '@/src/components/ui/Button';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { WaterGlass } from '@/src/components/water/WaterGlass';
import { Screen } from '@/src/components/ui/Screen';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getMonthTotals, useWaterToday } from '@/src/lib/water';
import { radii, spacing, type as t } from '@/src/styles/tokens';

const PRESETS = [200, 300, 500];

export default function WaterScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { day, goalMl, totalMl, add, remove, setGoal } = useWaterToday();

  const [customOpen, setCustomOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('250');
  const [goalDraft, setGoalDraft] = useState(String(goalMl));
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);

  const [monthData, setMonthData] = useState<{ date: string; total: number }[]>([]);
  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    getMonthTotals(now.getFullYear(), now.getMonth()).then(setMonthData);
  }, [day.entries.length]);

  useEffect(() => {
    setGoalDraft(String(goalMl));
  }, [goalMl]);

  const pct = Math.min(1, totalMl / Math.max(1, goalMl));

  const bumpSV = useSharedValue(1);

  const cupBumpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bumpSV.value }],
  }));

  const handleAdd = async (ml: number) => {
    bumpSV.value = withSequence(
      withTiming(1.04, { duration: 120, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 9, stiffness: 220 })
    );
    await add(ml);
  };

  const handleCustomAdd = async () => {
    const n = Number(customAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    await handleAdd(n);
    setCustomOpen(false);
  };

  const handleSaveGoal = async () => {
    const n = Number(goalDraft);
    if (!Number.isFinite(n) || n <= 0) return;
    await setGoal(n);
    setGoalOpen(false);
  };

  const chartData = useMemo(() => {
    return monthData.map((d, i) => {
      const dayNum = i + 1;
      const isToday = d.date === new Date().toISOString().slice(0, 10);
      const reached = d.total >= goalMl && goalMl > 0;
      return {
        value: d.total,
        label: dayNum % 5 === 0 || dayNum === 1 ? String(dayNum) : '',
        frontColor: isToday ? c.primary : reached ? c.primary : `${c.primary}55`,
      };
    });
  }, [monthData, goalMl, c.primary]);

  const totalLabel = `${(totalMl / 1000).toFixed(2)} L`;
  const goalLabel = `${(goalMl / 1000).toFixed(1)} L`;
  const pctLabel = `${Math.round(pct * 100)}%`;
  const goalReached = pct >= 1;
  const loggedDays = monthData.filter((d) => d.total > 0);
  const avgMl = loggedDays.length
    ? loggedDays.reduce((sum, d) => sum + d.total, 0) / loggedDays.length
    : 0;
  const avgLabel = `${(avgMl / 1000).toFixed(1)} L`;

  return (
    <Screen scroll contentContainerStyle={styles.screen}>
      <View style={styles.headerRow}>
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <ChevronLeft size={22} color={c.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.mutedText }]}>HYDRATION</Text>
          <Text style={[styles.h1, { color: c.text }]}>Water</Text>
        </View>
        <PressableScale
          onPress={() => setGoalOpen(true)}
          style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Settings2 size={18} color={c.text} />
        </PressableScale>
      </View>

      {/* Glass */}
      <Pressable onPress={() => handleAdd(250)} style={styles.cupWrap}>
        <Animated.View style={[styles.cupOuter, cupBumpStyle]}>
          <WaterGlass progress={pct} primary={c.primary} surfaceTint={c.primary} />
          <View style={styles.cupReadout} pointerEvents="none">
            <Text style={[styles.totalText, { color: c.text }]}>{totalLabel}</Text>
            <Text style={[styles.totalSub, { color: c.mutedText }]}>
              of {goalLabel} · {pctLabel}
            </Text>
          </View>
        </Animated.View>
        <View style={[styles.tapPill, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Droplet size={12} color={c.primary} />
          <Text style={[styles.tapText, { color: c.mutedText }]}>Tap glass to add 250ml</Text>
        </View>
        <View style={[styles.levelTrack, { backgroundColor: c.border }]}>
          <View
            style={[
              styles.levelFill,
              {
                width: `${Math.min(100, Math.round(pct * 100))}%`,
                backgroundColor: goalReached ? c.success : c.primary,
              },
            ]}
          />
        </View>
      </Pressable>

      {/* Quick add row */}
      <View style={styles.presetRow}>
        {PRESETS.map((ml) => (
          <PressableScale
            key={ml}
            onPress={() => handleAdd(ml)}
            style={[styles.presetBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Plus size={14} color={c.primary} />
            <Text style={[styles.presetText, { color: c.text }]}>{ml}ml</Text>
          </PressableScale>
        ))}
        <PressableScale
          onPress={() => setCustomOpen(true)}
          style={[styles.presetBtn, { backgroundColor: c.primary, borderColor: c.primary }]}
        >
          <Text style={[styles.presetText, { color: c.primaryText }]}>Custom</Text>
        </PressableScale>
      </View>

      {/* Today log */}
      <SectionHeader
        eyebrow="Today"
        title="Entries"
        trailing={
          day.entries.length > 0 ? (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${goalReached ? c.success : c.primary}1A`,
                  borderColor: `${goalReached ? c.success : c.primary}55`,
                },
              ]}
            >
              <Check size={12} color={goalReached ? c.success : c.primary} />
              <Text style={[styles.statusBadgeText, { color: goalReached ? c.success : c.primary }]}>
                {goalReached ? 'Goal reached' : 'On track'}
              </Text>
            </View>
          ) : undefined
        }
      />
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {day.entries.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.mutedText }]}>
            No entries yet. Tap the cup or a preset to log water.
          </Text>
        ) : (
          day.entries
            .slice()
            .reverse()
            .map((e) => {
              const time = new Date(e.loggedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <View key={e.id} style={[styles.entryRow, { borderColor: c.border }]}>
                  <View style={[styles.entryDot, { backgroundColor: `${c.primary}22` }]}>
                    <Droplet size={14} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryAmount, { color: c.text }]}>{e.amountMl} ml</Text>
                    <Text style={[styles.entryTime, { color: c.mutedText }]}>{time}</Text>
                  </View>
                  <Pressable
                    onPress={() => setRemoveTarget({ id: e.id, label: `${e.amountMl} ml at ${time}` })}
                    hitSlop={10}
                  >
                    <Trash2 size={16} color={c.mutedText} />
                  </Pressable>
                </View>
              );
            })
        )}
      </View>

      {/* Monthly graph */}
      <SectionHeader
        eyebrow="This month"
        title={monthLabel}
        subtitle="Daily intake vs goal"
        trailing={
          avgMl > 0 ? (
            <View style={styles.avgPill}>
              <Text style={[styles.avgLabel, { color: c.mutedText }]}>AVG</Text>
              <Text style={[styles.avgValue, { color: c.text }]}>{avgLabel}</Text>
            </View>
          ) : undefined
        }
      />
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm }]}>
        <BarChart
          data={chartData}
          height={200}
          barWidth={7}
          spacing={3}
          initialSpacing={6}
          endSpacing={6}
          barBorderTopLeftRadius={3}
          barBorderTopRightRadius={3}
          hideRules
          xAxisColor={c.border}
          yAxisColor="transparent"
          yAxisTextStyle={{ color: c.mutedText, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: c.mutedText, fontSize: 9, marginTop: 4 }}
          noOfSections={4}
          maxValue={Math.max(goalMl, ...monthData.map((d) => d.total), 500)}
          formatYLabel={(v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            return n >= 1000 ? `${(n / 1000).toFixed(1)}L` : `${Math.round(n)}`;
          }}
          showReferenceLine1
          referenceLine1Position={goalMl}
          referenceLine1Config={{
            color: c.mutedText,
            dashWidth: 4,
            dashGap: 4,
            thickness: 1,
            labelText: 'Goal',
            labelTextStyle: { color: c.mutedText, fontSize: 10 },
          }}
        />
      </View>

      {/* Custom amount sheet */}
      <Sheet visible={customOpen} onClose={() => setCustomOpen(false)} title="Add custom amount">
        <Stepper value={customAmount} onChange={setCustomAmount} />
        <Button title="Log water" onPress={handleCustomAdd} />
      </Sheet>

      {/* Goal sheet */}
      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="Daily goal">
        <Stepper value={goalDraft} onChange={setGoalDraft} step={250} />
        <Button title="Save goal" onPress={handleSaveGoal} />
      </Sheet>

      <ConfirmModal
        visible={!!removeTarget}
        title="Remove entry"
        message={removeTarget?.label ?? ''}
        confirmLabel="Remove"
        variant="danger"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (removeTarget) await remove(removeTarget.id);
          setRemoveTarget(null);
        }}
      />
    </Screen>
  );
}

function Stepper({
  value,
  onChange,
  step = 50,
}: {
  value: string;
  onChange: (v: string) => void;
  step?: number;
}) {
  const c = useThemeColors();
  const change = (delta: number) => {
    const base = Number(value);
    const safe = Number.isFinite(base) ? base : 0;
    onChange(String(Math.max(0, safe + delta)));
  };
  return (
    <View style={[styles.stepper, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Pressable onPress={() => change(-step)} style={[styles.stepBtn, { backgroundColor: c.card }]}>
        <Minus size={18} color={c.text} />
      </Pressable>
      <View style={styles.stepValueWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          style={[styles.stepInput, { color: c.text }]}
        />
        <Text style={[styles.stepUnit, { color: c.mutedText }]}>ml</Text>
      </View>
      <Pressable onPress={() => change(step)} style={[styles.stepBtn, { backgroundColor: c.card }]}>
        <Plus size={18} color={c.text} />
      </Pressable>
    </View>
  );
}

function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const c = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
        <Text style={[styles.sheetTitle, { color: c.text }]}>{title}</Text>
        <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: spacing['3xl'], paddingHorizontal: 0, gap: spacing.xs },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  h1: { fontFamily: t.weight.extrabold, fontSize: t.size.h1, letterSpacing: t.tracking.tight, marginTop: 2 },
  cupWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  cupOuter: {
    width: 220,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cupReadout: {
    position: 'absolute',
    top: 70,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  totalText: {
    fontFamily: t.weight.extrabold,
    fontSize: 40,
    letterSpacing: t.tracking.tight,
  },
  totalSub: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.sm,
  },
  tapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  tapText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.wide,
  },
  levelTrack: {
    width: 200,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  levelFill: { height: '100%', borderRadius: 3 },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    flexWrap: 'wrap',
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetText: { fontFamily: t.weight.bold, fontSize: t.size.sm },
  card: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  emptyText: { fontFamily: t.weight.regular, fontSize: t.size.sm, textAlign: 'center', paddingVertical: spacing.md },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryAmount: { fontFamily: t.weight.semibold, fontSize: t.size.body },
  entryTime: { fontFamily: t.weight.regular, fontSize: t.size.xs },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeText: { fontFamily: t.weight.bold, fontSize: t.size.xs },
  avgPill: { alignItems: 'flex-end' },
  avgLabel: { fontFamily: t.weight.semibold, fontSize: 10, letterSpacing: t.tracking.eyebrow },
  avgValue: { fontFamily: t.weight.extrabold, fontSize: t.size.body },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 999, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { fontFamily: t.weight.bold, fontSize: t.size.h3 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  stepInput: {
    fontFamily: t.weight.extrabold,
    fontSize: 36,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  stepUnit: { fontFamily: t.weight.semibold, fontSize: t.size.body },
});
