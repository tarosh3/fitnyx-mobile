import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export function WeeklyCalendar() {
  const palette = useThemeColors();

  const calendarDays = useMemo(() => {
    const today = new Date();
    // In JS/date-fns, weekStartsOn: 1 means Monday
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 7; i += 1) {
      const current = addDays(start, i);
      days.push({
        day: format(current, 'EEE'), // Mon, Tue...
        date: format(current, 'd'), // 22, 23...
        fullDate: current,
        active: isSameDay(current, today),
        dot: i % 2 !== 0, // Mock dot logic for visual variety
      });
    }
    return days;
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {calendarDays.map((item, index) => {
          const isActive = item.active;

          return (
            <View key={index} style={styles.dayWrap}>
              <View
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isActive ? palette.primary : 'transparent',
                    borderColor: isActive ? palette.primary : palette.border,
                  },
                ]}
              >
                {/* Dot indicator */}
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
                      marginTop: item.dot ? 8 : 0,
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 12, // Space between items
  },
  dayWrap: {
    alignItems: 'center',
    minWidth: 50,
  },
  dayCard: {
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 1,
    height: 85,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  dot: {
    borderRadius: 999,
    height: 6,
    position: 'absolute',
    top: 12,
    width: 6,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
