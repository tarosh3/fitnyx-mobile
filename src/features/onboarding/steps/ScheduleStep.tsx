import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { DAY_LABELS, WEEKDAYS } from '@/src/features/plan/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { TimeOfDay, Weekday } from '@/src/lib/api/plan';
import { type } from '@/src/styles/tokens';

const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
];

const DURATIONS = [20, 30, 45, 60, 75];

/** Days the backend suggests for each frequency answer (internal/fitplan). */
const SUGGESTED: Record<string, Weekday[]> = {
  '2_3_days': ['mon', 'wed', 'fri'],
  '3_4_days': ['mon', 'tue', 'thu', 'fri'],
  '5_6_days': ['mon', 'tue', 'wed', 'fri', 'sat'],
  everyday: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
};

function Chip({ label, on, onPress, a11y, fill }: { label: string; on: boolean; onPress: () => void; a11y: string; fill?: boolean }) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={a11y}
      style={[styles.chip, fill && styles.chipFill, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}
    >
      <Text style={[styles.chipText, { color: on ? c.primaryText : c.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Which days, what time of day and how long — feeds the plan and its reminder. */
export function ScheduleStep({ data, onNext, saving }: OnboardingStepProps) {
  const c = useThemeColors();
  const profile = data?.fitness_profile;
  const [days, setDays] = useState<Weekday[]>(
    () => (profile?.preferred_days?.length ? (profile.preferred_days as Weekday[]).map((d) => d.toLowerCase() as Weekday) : SUGGESTED[profile?.workout_frequency ?? ''] ?? SUGGESTED['2_3_days']),
  );
  const [time, setTime] = useState<TimeOfDay>((profile?.preferred_time as TimeOfDay) || 'evening');
  const [minutes, setMinutes] = useState(profile?.workout_duration_min ?? 45);
  const tooFew = days.length < 2;
  const tooMany = days.length > 6;

  const toggleDay = (d: Weekday) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <StepScaffold
      title="When can you train?"
      subtitle="We'll plan your week and remind you on these days."
      onContinue={() => onNext({ preferred_days: WEEKDAYS.filter((d) => days.includes(d)), preferred_time: time, workout_duration_min: minutes })}
      saving={saving}
      disabled={tooFew || tooMany}
      error={tooFew ? 'Pick at least 2 days.' : tooMany ? 'Keep at least one rest day.' : undefined}
    >
      <View style={styles.wrap}>
        <Text style={[styles.label, { color: c.mutedText }]}>Days</Text>
        <View style={styles.dayRow}>
          {WEEKDAYS.map((d) => (
            <Chip key={d} label={DAY_LABELS[d].slice(0, 2)} on={days.includes(d)} onPress={() => toggleDay(d)} a11y={DAY_LABELS[d]} fill />
          ))}
        </View>
        <Text style={[styles.label, { color: c.mutedText }]}>Time of day</Text>
        <View style={styles.row}>
          {TIMES.map((t) => <Chip key={t.id} label={t.label} on={time === t.id} onPress={() => setTime(t.id)} a11y={t.label} />)}
        </View>
        <Text style={[styles.label, { color: c.mutedText }]}>Workout length</Text>
        <View style={styles.row}>
          {DURATIONS.map((m) => <Chip key={m} label={`${m} min`} on={minutes === m} onPress={() => setMinutes(m)} a11y={`${m} minutes`} />)}
        </View>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  label: { fontSize: 14, fontFamily: type.weight.semibold, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // The 7 day chips share one row (2-letter labels) so the last one never
  // orphans onto a second line; time/length chips keep their padded width.
  dayRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 6 },
  chip: { minWidth: 44, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipFill: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, paddingHorizontal: 0 },
  chipText: { fontSize: 15, fontFamily: type.weight.semibold },
});
