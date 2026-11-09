import { Minus, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBuildProgram } from '@/src/features/program/data';
import { usePlan } from '@/src/features/plan/data';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { PROGRAM_LENGTHS, type Program } from '@/src/lib/api/programs';
import { radii, spacing, type } from '@/src/styles/tokens';

const MINUTES = [30, 45, 60, 75] as const;
const nearest = (v: number) => MINUTES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

/** Choose a length, days and session time; the rules build the rest. */
export function BuildProgramSheet({ visible, onClose, onBuilt }: { visible: boolean; onClose: () => void; onBuilt: (p: Program) => void }) {
  const c = useThemeColors();
  const schedule = usePlan().data?.schedule;
  const { build, busy } = useBuildProgram();
  const [weeks, setWeeks] = useState(8);
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState<number>(45);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (schedule) {
      setDays(Math.min(6, Math.max(2, schedule.days_per_week)));
      setMinutes(nearest(schedule.session_min));
    }
  }, [visible, schedule]);

  const onBuild = async () => {
    setError(null);
    try {
      onBuilt(await build({ weeks, days_per_week: days, session_min: minutes }));
    } catch (e) {
      const status = (e as { status?: number }).status;
      // Toasts draw under the sheet, so problems show inside it.
      setError(status === 422 ? 'Finish your fitness profile first: we need your goal to build a program.'
        : status ? "Couldn't build your program. Try again." : "You're offline. Connect to build your program.");
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Build my program"
      subtitle="Picked for your goal, equipment and injuries. Every workout's targets come from what you did last time."
      footer={<Button testID="program-build" title={`Build ${weeks}-week program`} loading={busy} onPress={onBuild} />}>
      <View style={styles.body}>
        <Text style={[styles.label, { color: c.mutedText }]}>HOW LONG</Text>
        <View style={styles.chips}>
          {PROGRAM_LENGTHS.map((w) => (
            <Chip key={w} label={`${w} weeks`} on={weeks === w} onPress={() => setWeeks(w)} />
          ))}
        </View>
        <Text style={[styles.hint, { color: c.mutedText }]}>Every 4th week is lighter. The last week tests what you built.</Text>

        <Text style={[styles.label, { color: c.mutedText }]}>WORKOUTS A WEEK</Text>
        <View style={styles.stepper}>
          <Step icon={<Minus size={20} color={c.text} />} label="Fewer days" disabled={days <= 2} onPress={() => setDays(days - 1)} />
          <Text style={[styles.days, { color: c.text }]} accessibilityLiveRegion="polite">{days}</Text>
          <Step icon={<Plus size={20} color={c.text} />} label="More days" disabled={days >= 6} onPress={() => setDays(days + 1)} />
        </View>

        <Text style={[styles.label, { color: c.mutedText }]}>MINUTES PER WORKOUT</Text>
        <View style={styles.chips}>
          {MINUTES.map((m) => <Chip key={m} label={`${m} min`} on={minutes === m} onPress={() => setMinutes(m)} />)}
        </View>
        {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
      </View>
    </Sheet>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[styles.chip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.accentSoft : c.card }]}>
      <Text style={[styles.chipText, { color: on ? c.accent : c.text }]}>{label}</Text>
    </Pressable>
  );
}

function Step({ icon, label, disabled, onPress }: { icon: React.ReactNode; label: string; disabled: boolean; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      style={[styles.step, { borderColor: c.border, backgroundColor: c.card }, disabled && { opacity: 0.4 }]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  label: { fontFamily: type.weight.semibold, fontSize: 12, letterSpacing: 1, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.base, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontFamily: type.weight.semibold, fontSize: 15 },
  hint: { fontFamily: type.weight.regular, fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  step: { width: 48, height: 48, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  days: { fontFamily: type.weight.extrabold, fontSize: 28, minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] },
  error: { fontFamily: type.weight.semibold, fontSize: 14, textAlign: 'center' },
});
