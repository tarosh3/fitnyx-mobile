import Slider from '@react-native-community/slider';
import { ChevronRight, Clock, Moon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { DayData } from '@/src/features/workouts/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const NEON_LIME = '#80f20d';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

interface DayConfigurationFormProps {
  numDays: number;
  initialDays: DayData[];
  onSubmit: (days: DayData[]) => void;
  loading: boolean;
}

export function DayConfigurationForm({ numDays, initialDays, onSubmit, loading }: DayConfigurationFormProps) {
  const palette = useThemeColors();
  const [days, setDays] = useState<DayData[]>([]);

  useEffect(() => {
    if (initialDays.length > 0) {
      setDays(initialDays);
      return;
    }

    const generated: DayData[] = [];
    for (let i = 0; i < numDays; i += 1) {
      generated.push({
        tempId: i,
        title: '',
        is_rest_day: false,
        estimated_duration_min: 60,
      });
    }
    setDays(generated);
  }, [initialDays, numDays]);

  const updateDay = (index: number, field: keyof DayData, value: any) => {
    setDays((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>CONFIGURE YOUR DAYS</Text>
          <Text style={styles.formSubtitle}>SET UP EACH WORKOUT DAY WITH TITLE AND OPTIONS</Text>
        </View>

        {days.map((day, index) => {
          const isRest = day.is_rest_day;
          return (
            <View
              key={day.tempId}
              style={[
                styles.dayCard,
                isRest && styles.dayCardRest
              ]}
            >
              <View style={styles.dayHeader}>
                <View style={[styles.dayBadge, isRest && { borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.dayBadgeText, isRest && { color: 'rgba(255,255,255,0.4)' }]}>DAY {index + 1}</Text>
                </View>
                <View style={styles.restToggle}>
                  <Text style={styles.restToggleLabel}>REST DAY</Text>
                  <Switch
                    value={day.is_rest_day}
                    onValueChange={(value) => updateDay(index, 'is_rest_day', value)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(128, 242, 13, 0.3)' }}
                    thumbColor={day.is_rest_day ? NEON_LIME : '#ccc'}
                  />
                </View>
              </View>

              {isRest ? (
                <View style={styles.restInfo}>
                  <Moon size={16} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.restText}>REST & RECOVERY SESSION</Text>
                </View>
              ) : (
                <View style={styles.dayContent}>
                  <View style={styles.inputGroup}>
                    <Input
                      value={day.title || ''}
                      onChangeText={(value) => updateDay(index, 'title', value)}
                      placeholder="TITLE (E.G. CHEST & TRICEPS)"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input
                      value={day.notes || ''}
                      onChangeText={(value) => updateDay(index, 'notes', value)}
                      placeholder="ADDITIONAL NOTES"
                      multiline
                      numberOfLines={3}
                      style={styles.notesInput}
                    />
                  </View>

                  <View style={styles.durationSection}>
                    <View style={styles.durationHead}>
                      <View style={styles.durationLabelRow}>
                        <Clock size={12} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.durationLabel}>ESTIMATED DURATION</Text>
                      </View>
                      <Text style={styles.durationValue}>{day.estimated_duration_min || 60} MIN</Text>
                    </View>
                    <Slider
                      value={day.estimated_duration_min || 60}
                      minimumValue={15}
                      maximumValue={180}
                      step={15}
                      minimumTrackTintColor={NEON_LIME}
                      maximumTrackTintColor="rgba(255,255,255,0.1)"
                      thumbTintColor={NEON_LIME}
                      onValueChange={(value) => updateDay(index, 'estimated_duration_min', Math.round(value))}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={loading}
        onPress={() => onSubmit(days)}
        style={({ pressed }) => [
          styles.submitBtn,
          loading && { opacity: 0.5 },
          pressed && { opacity: 0.9, scale: 0.98 }
        ]}
      >
        <Text style={styles.submitBtnText}>
          {loading ? 'SAVING DAYS...' : 'CONTINUE TO EXERCISES'}
        </Text>
        <ChevronRight size={18} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    gap: 24,
  },
  formHeader: {
    gap: 4,
  },
  formTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  formSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dayCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    gap: 16,
  },
  dayCardRest: {
    opacity: 0.7,
    borderStyle: 'dashed',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dayBadgeText: {
    color: NEON_LIME,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  restToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restToggleLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  restInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  restText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dayContent: {
    gap: 12,
  },
  inputGroup: {
    gap: 8,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: BORDER_COLOR,
    color: '#fff',
    height: 48,
    borderRadius: 12,
  },
  notesInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: BORDER_COLOR,
    color: '#fff',
    minHeight: 80,
    borderRadius: 12,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  durationSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  durationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  durationValue: {
    color: NEON_LIME,
    fontSize: 13,
    fontWeight: '900',
  },
  submitBtn: {
    backgroundColor: NEON_LIME,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
