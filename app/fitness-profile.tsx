import { useRouter } from 'expo-router';
import {
  Activity,
  ChevronLeft,
  Dumbbell,
  Flame,
  Heart,
  Salad,
  Sparkles,
  Sunrise,
  Sunset,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Field } from '@/src/components/ui/Field';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import {
  FitnessProfile,
  getFitnessProfile,
  updateFitnessProfile,
} from '@/src/lib/api/onboarding';
import { kgToLbs, lbsToKg, useWeightUnit } from '@/src/lib/prefs';
import { radii, spacing, type as t } from '@/src/styles/tokens';

const PRIMARY_GOALS = [
  { value: 'lose_weight', label: 'Lose weight', icon: Flame },
  { value: 'build_muscle', label: 'Build muscle', icon: Dumbbell },
  { value: 'endurance', label: 'Endurance', icon: Heart },
  { value: 'flexibility', label: 'Flexibility', icon: Activity },
  { value: 'wellness', label: 'Wellness', icon: Sparkles },
] as const;

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Inter' },
  { value: 'advanced', label: 'Advanced' },
] as const;

const WORKOUT_TYPES = [
  { value: 'strength', label: 'Strength', icon: Dumbbell },
  { value: 'hiit', label: 'HIIT', icon: Zap },
  { value: 'yoga', label: 'Yoga', icon: Heart },
  { value: 'cardio', label: 'Cardio', icon: Flame },
  { value: 'mobility', label: 'Mobility', icon: Activity },
] as const;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning', icon: Sunrise },
  { value: 'afternoon', label: 'Afternoon', icon: Sparkles },
  { value: 'evening', label: 'Evening', icon: Sunset },
] as const;

const DIETARY = [
  'Vegetarian',
  'Vegan',
  'Non-Veg',
  'Eggetarian',
  'Keto',
  'Pescatarian',
  'No preference',
];

const EQUIPMENT_OPTIONS = [
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'bands', label: 'Bands' },
  { value: 'machines', label: 'Gym machines' },
  { value: 'cardio_machine', label: 'Cardio machines' },
];

type Tab = 'goals' | 'preferences' | 'health';

export default function FitnessProfileScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weightUnit] = useWeightUnit();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('goals');

  const [primaryGoal, setPrimaryGoal] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [yearsTraining, setYearsTraining] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [workoutTypes, setWorkoutTypes] = useState<string[]>([]);
  const [duration, setDuration] = useState(45);
  const [days, setDays] = useState<string[]>([]);
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [injuries, setInjuries] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const profile = await getFitnessProfile();
      setPrimaryGoal(profile.primary_goal || '');
      const lvl = (profile.experience_level || 'beginner') as 'beginner' | 'intermediate' | 'advanced';
      setExperienceLevel(EXPERIENCE_LEVELS.some((l) => l.value === lvl) ? lvl : 'beginner');
      setYearsTraining(profile.years_training != null ? String(profile.years_training) : '');
      if (profile.target_weight_kg != null) {
        const display =
          weightUnit === 'kg' ? profile.target_weight_kg : kgToLbs(profile.target_weight_kg);
        setTargetWeight(display.toFixed(1));
      }
      setWeeklyTarget(profile.weekly_workout_target ?? 3);
      setWorkoutTypes(profile.preferred_workout_type ?? []);
      setDuration(profile.workout_duration_min ?? 45);
      setDays(profile.preferred_days ?? []);
      setTimeSlot(profile.preferred_time || '');
      setEquipment(
        profile.equipment_access ? profile.equipment_access.split(',').filter(Boolean) : []
      );
      setDietary(profile.dietary_preferences ?? []);
      setInjuries((profile.injuries ?? []).join(', '));
    } catch (err) {
      console.error('Failed to load fitness profile', err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    if (arr.includes(v)) setArr(arr.filter((x) => x !== v));
    else setArr([...arr, v]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const targetWeightKg = targetWeight
        ? weightUnit === 'kg'
          ? parseFloat(targetWeight)
          : lbsToKg(parseFloat(targetWeight))
        : undefined;

      const payload: Partial<FitnessProfile> = {
        primary_goal: primaryGoal,
        experience_level: experienceLevel,
        years_training: yearsTraining ? parseInt(yearsTraining, 10) : undefined,
        target_weight_kg: targetWeightKg && !isNaN(targetWeightKg) ? targetWeightKg : undefined,
        weekly_workout_target: weeklyTarget,
        preferred_workout_type: workoutTypes,
        workout_duration_min: duration,
        preferred_days: days,
        preferred_time: timeSlot || undefined,
        equipment_access: equipment.join(','),
        dietary_preferences: dietary,
        injuries: injuries
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await updateFitnessProfile(payload);
      Alert.alert('Saved', 'Fitness profile updated.');
    } catch (err: any) {
      console.error('Failed to save fitness profile', err);
      Alert.alert('Error', err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.flexCenter, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Sticky Header + Tabs */}
        <View style={{ paddingTop: insets.top + spacing.sm, backgroundColor: c.background }}>
          <View style={styles.headerRow}>
            <PressableScale
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
              style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <ChevronLeft size={22} color={c.text} />
            </PressableScale>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: c.mutedText }]}>ACCOUNT</Text>
              <Text style={[styles.h1, { color: c.text }]}>Fitness Profile</Text>
            </View>
          </View>

          <View style={styles.tabsWrap}>
            <SegmentedControl<Tab>
              options={[
                { label: 'Goals', value: 'goals' },
                { label: 'Routine', value: 'preferences' },
                { label: 'Health', value: 'health' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'goals' ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>PRIMARY GOAL</Text>
              <View style={styles.goalGrid}>
                {PRIMARY_GOALS.map((g) => {
                  const active = primaryGoal === g.value;
                  const Icon = g.icon;
                  return (
                    <PressableScale
                      key={g.value}
                      onPress={() => setPrimaryGoal(g.value)}
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: active ? `${c.primary}1A` : c.surface,
                          borderColor: active ? c.primary : c.border,
                        },
                      ]}
                    >
                      <Icon size={20} color={active ? c.primary : c.text} strokeWidth={1.8} />
                      <Text style={[styles.goalLabel, { color: active ? c.primary : c.text }]}>
                        {g.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              <Field
                label={`Target weight (${weightUnit})`}
                value={targetWeight}
                onChangeText={(v) => setTargetWeight(v.replace(/[^0-9.]/g, '').slice(0, 6))}
                keyboardType="decimal-pad"
                placeholder="Optional"
                leading={<Target size={16} color={c.mutedText} strokeWidth={1.8} />}
              />

              <View style={{ gap: spacing.xs }}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.fieldLabel, { color: c.mutedText }]}>WEEKLY TARGET</Text>
                  <Text style={[styles.fieldValue, { color: c.primary }]}>{weeklyTarget} / week</Text>
                </View>
                <View style={styles.stepperRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                    const active = weeklyTarget >= n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setWeeklyTarget(n)}
                        style={[
                          styles.stepperDot,
                          {
                            backgroundColor: active ? c.primary : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperLabel,
                            { color: active ? c.primaryText : c.mutedText },
                          ]}
                        >
                          {n}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>TRAINING LEVEL</Text>
                <SegmentedControl
                  options={EXPERIENCE_LEVELS.map((l) => ({ label: l.label, value: l.value }))}
                  value={experienceLevel}
                  onChange={setExperienceLevel}
                />
              </View>

              <Field
                label="Years training"
                value={yearsTraining}
                onChangeText={(v) => setYearsTraining(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="0"
                leading={<Trophy size={16} color={c.mutedText} strokeWidth={1.8} />}
              />
            </View>
          ) : null}

          {tab === 'preferences' ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>WORKOUT TYPES</Text>
                <View style={styles.chipRow}>
                  {WORKOUT_TYPES.map((w) => {
                    const active = workoutTypes.includes(w.value);
                    const Icon = w.icon;
                    return (
                      <PressableScale
                        key={w.value}
                        onPress={() => toggle(workoutTypes, setWorkoutTypes, w.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? `${c.primary}1A` : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Icon size={14} color={active ? c.primary : c.mutedText} strokeWidth={2} />
                        <Text style={[styles.chipText, { color: active ? c.primary : c.text }]}>
                          {w.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.fieldLabel, { color: c.mutedText }]}>SESSION DURATION</Text>
                  <Text style={[styles.fieldValue, { color: c.primary }]}>{duration} min</Text>
                </View>
                <View style={styles.stepperRow}>
                  {[15, 30, 45, 60, 75, 90].map((mins) => {
                    const active = duration === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => setDuration(mins)}
                        style={[
                          styles.stepperPill,
                          {
                            backgroundColor: active ? c.primary : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperPillText,
                            { color: active ? c.primaryText : c.text },
                          ]}
                        >
                          {mins}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>AVAILABLE DAYS</Text>
                <View style={styles.dayRow}>
                  {DAYS.map((d) => {
                    const active = days.includes(d);
                    return (
                      <Pressable
                        key={d}
                        onPress={() => toggle(days, setDays, d)}
                        style={[
                          styles.dayPill,
                          {
                            backgroundColor: active ? c.primary : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: active ? c.primaryText : c.text },
                          ]}
                        >
                          {d.slice(0, 1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>PREFERRED TIME</Text>
                <View style={styles.timeRow}>
                  {TIME_SLOTS.map((ts) => {
                    const active = timeSlot === ts.value;
                    const Icon = ts.icon;
                    return (
                      <PressableScale
                        key={ts.value}
                        onPress={() => setTimeSlot(active ? '' : ts.value)}
                        style={[
                          styles.timeCard,
                          {
                            backgroundColor: active ? `${c.primary}1A` : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Icon size={18} color={active ? c.primary : c.text} strokeWidth={1.8} />
                        <Text style={[styles.timeLabel, { color: active ? c.primary : c.text }]}>
                          {ts.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>EQUIPMENT</Text>
                <View style={styles.chipRow}>
                  {EQUIPMENT_OPTIONS.map((eq) => {
                    const active = equipment.includes(eq.value);
                    return (
                      <PressableScale
                        key={eq.value}
                        onPress={() => toggle(equipment, setEquipment, eq.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? `${c.primary}1A` : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: active ? c.primary : c.text }]}>
                          {eq.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {tab === 'health' ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>DIET</Text>
                <View style={styles.chipRow}>
                  {DIETARY.map((d) => {
                    const active = dietary.includes(d);
                    return (
                      <PressableScale
                        key={d}
                        onPress={() => toggle(dietary, setDietary, d)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? `${c.primary}1A` : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Salad size={14} color={active ? c.primary : c.mutedText} strokeWidth={2} />
                        <Text style={[styles.chipText, { color: active ? c.primary : c.text }]}>{d}</Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>INJURIES / LIMITATIONS</Text>
                <View style={[styles.notesBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <TextInput
                    value={injuries}
                    onChangeText={(v) => v.length <= 280 && setInjuries(v)}
                    placeholder="Comma-separated (e.g. lower back, knee)"
                    placeholderTextColor={c.mutedText}
                    multiline
                    textAlignVertical="top"
                    style={[styles.notesInput, { color: c.text }]}
                    maxLength={280}
                  />
                </View>
              </View>
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.saveBar, { backgroundColor: c.background, borderColor: c.border }]}>
          <Button
            title={saving ? 'Saving…' : 'Save'}
            onPress={save}
            loading={saving}
            disabled={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  flexCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
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
  eyebrow: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: t.weight.extrabold,
    fontSize: t.size.h1,
    letterSpacing: t.tracking.tight,
    marginTop: 2,
  },
  tabsWrap: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.lg,
  },
  fieldLabel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontFamily: t.weight.bold,
    fontSize: t.size.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  goalCard: {
    minWidth: '30%',
    flexGrow: 1,
    flexBasis: 0,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: spacing.xs,
  },
  goalLabel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    textAlign: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  stepperDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    fontFamily: t.weight.bold,
    fontSize: t.size.sm,
  },
  stepperPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 48,
    alignItems: 'center',
  },
  stepperPillText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
  },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayPill: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: t.weight.bold,
    fontSize: t.size.sm,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timeCard: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeLabel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
  },
  notesBox: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    minHeight: 80,
  },
  notesInput: {
    fontFamily: t.weight.regular,
    fontSize: t.size.body,
    minHeight: 60,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing['2xl'] : spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
