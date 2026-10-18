import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, type } from '@/src/styles/tokens';
import { dateFromKey, type DayStatus } from '../model';

export interface StripDay {
  date: string;
  status: DayStatus;
}

const STATUS_TEXT: Record<DayStatus, string> = { hit: 'on target', over: 'over goal', under: 'under goal', none: 'nothing logged' };

/** The last seven days; each shows whether it landed on target. */
export function WeekStrip({ days, selected, today, onSelect }: {
  days: StripDay[]; selected: string; today: string; onSelect: (date: string) => void;
}) {
  const c = useThemeColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {days.map(({ date, status }) => {
        const d = dateFromKey(date);
        const on = date === selected;
        const isToday = date === today;
        const dot = status === 'hit' ? c.primary : status === 'over' ? c.diet.over : status === 'under' ? c.mutedText : 'transparent';
        const dotColor = on && status !== 'none' ? c.primaryText : dot;
        return (
          <Pressable key={date} onPress={() => onSelect(date)} accessibilityRole="button" accessibilityState={{ selected: on }}
            accessibilityLabel={`${isToday ? 'Today, ' : ''}${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, ${isToday ? 'in progress' : STATUS_TEXT[status]}`}
            style={({ pressed }) => [styles.day, { backgroundColor: on ? c.primary : 'transparent', borderColor: 'transparent' }, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.dow, { color: on ? c.primaryText : c.mutedText }]}>{isToday ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</Text>
            <Text style={[styles.date, { color: on ? c.primaryText : c.text }]}>{d.getDate()}</Text>
            <View style={[styles.dot, isToday
              ? { borderWidth: 1.5, borderColor: on ? c.primaryText : c.primary }
              : { backgroundColor: dotColor }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexGrow: 1, gap: 2 },
  day: { flex: 1, minWidth: 44, minHeight: 62, borderRadius: radii.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dow: { fontFamily: type.weight.medium, fontSize: 11 },
  date: { fontFamily: type.weight.bold, fontSize: 17 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
});
