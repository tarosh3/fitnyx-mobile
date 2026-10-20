import { BellRing, CalendarDays } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { PlanSchedule } from '@/src/lib/api/plan';
import { radii, spacing, type } from '@/src/styles/tokens';
import { disablePlanReminder, enablePlanReminder, hasPlanReminder } from './reminder';
import { DAY_LABELS, formatClock, TIME_LABELS, WEEKDAYS } from './model';

/** Training days, session length, time of day, and the matching reminder. */
export function ScheduleCard({ schedule, todayTraining }: { schedule: PlanSchedule; todayTraining?: boolean }) {
  const c = useThemeColors();
  const [reminder, setReminder] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hasPlanReminder().then(setReminder).catch(() => undefined);
  }, []);

  const toggle = async (on: boolean) => {
    setReminder(on);
    setError('');
    try {
      if (on) await enablePlanReminder(schedule);
      else await disablePlanReminder();
    } catch {
      setReminder(!on);
      setError('We couldn’t set the reminder. Check notification permissions in Settings.');
    }
  };

  const clock = formatClock(schedule.reminder_hour, schedule.reminder_minute);
  return (
    <View testID="plan-schedule" style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}>
        <CalendarDays size={18} color={c.accent} />
        <Text style={[styles.eyebrow, { color: c.accent }]}>YOUR WEEK</Text>
      </View>
      <Text style={[styles.h, { color: c.text }]}>
        {schedule.days_per_week} workouts · {schedule.session_min} min each
      </Text>
      <View style={styles.days} accessible accessibilityLabel={`Training days: ${schedule.preferred_days.map((d) => DAY_LABELS[d]).join(', ')}`}>
        {WEEKDAYS.map((d) => {
          const on = schedule.preferred_days.includes(d);
          return (
            <View key={d} style={[styles.day, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}>
              <Text style={[styles.dayText, { color: on ? c.primaryText : c.mutedText }]}>{DAY_LABELS[d].slice(0, 2)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.meta, { color: c.mutedText }]}>
        {TIME_LABELS[schedule.preferred_time]}{schedule.days_chosen ? '' : ' · suggested days, change them in your fitness profile'}
        {todayTraining === undefined ? '' : todayTraining ? ' · today is a training day' : ' · today is a rest day'}
      </Text>
      <View style={[styles.reminder, { borderColor: c.border }]}>
        <BellRing size={18} color={c.mutedText} />
        <Text style={[styles.reminderText, { color: c.text }]}>Remind me at {clock} on training days</Text>
        <Switch
          testID="plan-reminder"
          value={reminder}
          onValueChange={toggle}
          accessibilityLabel={`Remind me at ${clock} on training days`}
          trackColor={{ true: c.primary, false: c.border }}
        />
      </View>
      {error ? <Text style={[styles.meta, { color: c.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { fontFamily: type.weight.semibold, fontSize: type.size.xs, letterSpacing: type.tracking.eyebrow },
  h: { fontFamily: type.weight.bold, fontSize: 19 },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: { flex: 1, aspectRatio: 1, maxWidth: 44, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: type.weight.semibold, fontSize: 13 },
  meta: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 18 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  reminderText: { flex: 1, fontFamily: type.weight.medium, fontSize: 15 },
});
