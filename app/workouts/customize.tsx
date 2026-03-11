import { useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { Screen } from '@/src/components/ui/Screen';
import { DayConfigurationForm } from '@/src/features/workouts/DayConfigurationForm';
import { ExerciseSelector } from '@/src/features/workouts/ExerciseSelector';
import { PlanCreationForm } from '@/src/features/workouts/PlanCreationForm';
import { DayData, PlanData } from '@/src/features/workouts/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { addDaysToPlan, createWorkoutPlan } from '@/src/lib/api/workoutPlans';

const NEON_LIME = '#5fc793';

type WizardStep = 1 | 2 | 3;

const STEPS = [
  { number: 1, title: 'Create Plan' },
  { number: 2, title: 'Configure Days' },
  { number: 3, title: 'Add Exercises' },
];

export default function CustomizeWorkoutScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);

  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [planData, setPlanData] = useState<PlanData>({
    title: '',
    numDays: 3,
  });
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [dayIds, setDayIds] = useState<string[]>([]);

  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const hideConfirm = () => setConfirmConfig((prev) => ({ ...prev, visible: false }));

  const submitPlan = async (data: PlanData) => {
    setLoading(true);
    setError(null);
    try {
      const plan = await createWorkoutPlan({
        title: data.title,
        description: data.description,
        goal: data.goal,
      });
      setPlanData({ ...data, planId: plan.id });
      setStep(2);
    } catch (createError: any) {
      console.error('Failed to create plan', createError);
      if (createError?.message?.includes('Maximum of 2') || createError?.status === 409) {
        setError('You can only create up to 2 custom plans. Delete one to continue.');
      } else {
        setError('Failed to create workout plan.');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitDays = async (days: DayData[]) => {
    if (!planData.planId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await addDaysToPlan(planData.planId, days);
      setDaysData(days);
      setDayIds((response.data || []).map((day) => day.id));
      setStep(3);
    } catch (daysError) {
      console.error('Failed to add days', daysError);
      setError('Failed to configure workout days.');
    } finally {
      setLoading(false);
    }
  };

  const finishWizard = () => {
    setConfirmConfig({
      visible: true,
      title: 'PLAN CREATED',
      message: 'Your workout plan is ready.',
      onConfirm: () => {
        hideConfirm();
        router.replace('/dashboard');
      },
    });
  };

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (step === 1) {
              router.replace('/dashboard');
              return;
            }
            setStep((prev) => Math.max(1, prev - 1) as WizardStep);
          }}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={palette.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>CUSTOMIZE PLAN</Text>
          <Text style={styles.headerSubtitle}>STEP {step} OF 3</Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        {STEPS.map((item, index) => {
          const done = step > item.number;
          const current = step === item.number;

          return (
            <View key={item.number} style={styles.progressItem}>
              {index < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: step > item.number ? NEON_LIME : palette.border,
                    },
                  ]}
                />
              ) : null}

              <Pressable
                onPress={() => {
                  if (done) setStep(item.number as WizardStep);
                }}
                style={[
                  styles.circle,
                  {
                    backgroundColor: current ? NEON_LIME : done ? 'rgba(128, 242, 13, 0.15)' : palette.card,
                    borderColor: current ? NEON_LIME : done ? 'rgba(128, 242, 13, 0.3)' : palette.border,
                  },
                ]}
              >
                {done ? (
                  <Check size={16} color={current ? '#0A0A0A' : NEON_LIME} />
                ) : (
                  <Text style={[styles.stepNum, current && { color: '#0A0A0A' }]}>
                    {item.number}
                  </Text>
                )}
              </Pressable>
              <Text style={[styles.stepTitle, (current || done) && { color: palette.text }]}>
                {item.title.toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {step === 1 ? <PlanCreationForm initialData={planData} onSubmit={submitPlan} loading={loading} /> : null}
      {step === 2 ? <DayConfigurationForm numDays={planData.numDays} initialDays={daysData} onSubmit={submitDays} loading={loading} /> : null}
      {step === 3 && planData.planId ? (
        <ExerciseSelector planId={planData.planId} days={daysData} dayIds={dayIds} onFinish={finishWizard} />
      ) : null}

      <ConfirmModal
        visible={confirmConfig.visible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={hideConfirm}
      />
    </Screen>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
    paddingTop: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: palette.mutedText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  progressWrap: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  connector: {
    height: 2,
    left: '50%',
    position: 'absolute',
    right: '-50%',
    top: 20,
    zIndex: 0,
  },
  circle: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    width: 40,
    zIndex: 1,
  },
  stepNum: {
    color: palette.mutedText,
    fontSize: 14,
    fontWeight: '900',
  },
  stepTitle: {
    color: palette.mutedText,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
