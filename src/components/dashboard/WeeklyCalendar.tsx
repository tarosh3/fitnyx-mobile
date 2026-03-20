import { useThemeColors } from '@/src/hooks/useThemeColors';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WeeklyCalendarProps {
  /** Map of "YYYY-MM-DD" → workout count for the current week */
  activityDays?: Map<string, number>;
}

export function WeeklyCalendar({ activityDays }: WeeklyCalendarProps) {
  const palette = useThemeColors();

  const calendarDays = useMemo(() => {
    const today = new Date();
    // weekStartsOn: 1 means Monday
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 7; i += 1) {
      const current = addDays(start, i);
      const dateStr = format(current, 'yyyy-MM-dd');
      days.push({
        day: format(current, 'EEe').substring(0, 3).toUpperCase(), // MON, TUE...
        date: format(current, 'd'), // 2, 3...
        fullDate: current,
        active: isSameDay(current, today),
        dot: (activityDays?.get(dateStr) ?? 0) > 0,
      });
    }
    return days;
  }, [activityDays]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {calendarDays.map((item, index) => {
          const isActive = item.active;

          return (
            <View key={index} style={styles.dayWrap}>
              <View
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isActive ? palette.primary : palette.card,
                    borderColor: isActive ? palette.primary : palette.border,
                  },
                ]}
              >
                {/* Dot indicator — only shown for days with recorded workouts */}
                {item.dot && (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isActive ? palette.primaryText : palette.primary,
                      },
                    ]}
                  />
                )}

                <Text
                  style={[
                    styles.dayText,
                    {
                      color: isActive ? palette.primaryText : palette.mutedText,
                      marginTop: item.dot ? 6 : 0,
                    },
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateText,
                    {
                      color: isActive ? palette.primaryText : palette.text,
                    },
                  ]}
                >
                  {item.date}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayWrap: {
    alignItems: 'center',
    flex: 1,
  },
  dayCard: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    position: 'relative',
    width: '92%',
    maxWidth: 48,
  },
  dot: {
    borderRadius: 999,
    height: 4,
    position: 'absolute',
    top: 8,
    width: 4,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
