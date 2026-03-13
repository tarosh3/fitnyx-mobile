import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  completeOnboarding,
  getOnboarding,
  OnboardingData,
  saveOnboardingStep,
} from '@/src/lib/api/onboarding';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { useThemeColors } from '@/src/hooks/useThemeColors';

import { WelcomeStep } from '@/src/features/onboarding/steps/WelcomeStep';
import { UsernameStep } from '@/src/features/onboarding/steps/UsernameStep';
import { DOBStep } from '@/src/features/onboarding/steps/DOBStep';
import { GenderStep } from '@/src/features/onboarding/steps/GenderStep';
import { HeightStep } from '@/src/features/onboarding/steps/HeightStep';
import { WeightStep } from '@/src/features/onboarding/steps/WeightStep';
import { GoalStep } from '@/src/features/onboarding/steps/GoalStep';
import { ExperienceStep } from '@/src/features/onboarding/steps/ExperienceStep';
import { FrequencyStep } from '@/src/features/onboarding/steps/FrequencyStep';
import { LocationStep } from '@/src/features/onboarding/steps/LocationStep';
import { InjuriesStep } from '@/src/features/onboarding/steps/InjuriesStep';
import { IntensityStep } from '@/src/features/onboarding/steps/IntensityStep';
import { MotivationStep } from '@/src/features/onboarding/steps/MotivationStep';

const PRIMARY = '#5FC793';

const STEPS = [
  { id: 0, title: 'Welcome', component: WelcomeStep },
  { id: 1, title: 'Username', component: UsernameStep },
  { id: 2, title: 'Date of Birth', component: DOBStep },
  { id: 3, title: 'Gender', component: GenderStep },
  { id: 4, title: 'Height', component: HeightStep },
  { id: 5, title: 'Weight', component: WeightStep },
  { id: 6, title: 'Your Goal', component: GoalStep },
  { id: 7, title: 'Experience', component: ExperienceStep },
  { id: 8, title: 'Frequency', component: FrequencyStep },
  { id: 9, title: 'Location', component: LocationStep },
  { id: 10, title: 'Injuries', component: InjuriesStep },
  { id: 11, title: 'Intensity', component: IntensityStep },
  { id: 12, title: 'Motivation', component: MotivationStep },
];

function DotProgress({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dotRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && styles.dotCompleted,
            i === current && styles.dotCurrent,
          ]}
        />
      ))}
    </View>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stepKey, setStepKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getOnboarding();
        setOnboardingData(data);
        if (data.current_step > 1) {
          setCurrentStep(data.current_step - 1);
        }
      } catch (error) {
        console.error('Failed to load onboarding', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleNext = async (stepData?: Record<string, unknown>) => {
    if (currentStep === 0) {
      setCurrentStep(1);
      setStepKey((k) => k + 1);
      return;
    }

    if (stepData && currentStep > 0) {
      setSaving(true);
      try {
        if (currentStep === 1 && stepData.username) {
          supabase.auth
            .updateUser({
              data: {
                username: stepData.username,
              },
            })
            .catch(() => undefined);
        }

        const updated = await saveOnboardingStep(currentStep, stepData);
        setOnboardingData(updated);
      } catch (error) {
        console.error('Failed to save onboarding step', error);
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (currentStep === STEPS.length - 1) {
      setSaving(true);
      try {
        await completeOnboarding();
        router.replace('/dashboard');
      } catch (error) {
        console.error('Failed to complete onboarding', error);
      } finally {
        setSaving(false);
      }
      return;
    }

    setCurrentStep((prev) => prev + 1);
    setStepKey((k) => k + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setStepKey((k) => k + 1);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const StepComponent = STEPS[currentStep].component;
  const showHeader = currentStep > 0;

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {showHeader && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={handleBack}
              style={[styles.iconBtn, { backgroundColor: `${palette.text}08`, borderColor: palette.border }]}
            >
              <ChevronLeft size={18} color={palette.text} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: palette.text }]}>{STEPS[currentStep].title}</Text>

            <Pressable
              onPress={handleLogout}
              style={[styles.iconBtn, { backgroundColor: `${palette.text}08`, borderColor: palette.border }]}
            >
              <LogOut size={16} color={palette.mutedText} />
            </Pressable>
          </View>

          <DotProgress current={currentStep} total={STEPS.length - 1} />
        </View>
      )}

      {/* Step content with animated transition */}
      <Animated.View
        key={stepKey}
        entering={FadeIn.duration(350)}
        style={[styles.content, !showHeader && { paddingTop: insets.top + 16 }]}
      >
        <StepComponent onNext={handleNext} onBack={handleBack} data={onboardingData} saving={saving} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: 14,
  },
  dot: {
    backgroundColor: '#333',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotCompleted: {
    backgroundColor: PRIMARY,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotCurrent: {
    backgroundColor: PRIMARY,
    borderRadius: 4,
    height: 8,
    width: 16,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 10,
  },
});
