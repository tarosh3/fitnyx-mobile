import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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

export function OnboardingFlow() {
  const router = useRouter();
  const palette = useThemeColors();
  const { signOut } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/');
  };

  const progress = useMemo(() => (currentStep / (STEPS.length - 1)) * 100, [currentStep]);

  const StepComponent = STEPS[currentStep].component;

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.background }]}> 
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { borderColor: palette.border, backgroundColor: `${palette.background}EE` }]}> 
        <View style={styles.headerRow}>
          {currentStep > 0 ? (
            <Pressable onPress={handleBack} style={[styles.iconBtn, { borderColor: palette.border }]}> 
              <ChevronLeft size={18} color={palette.text} />
            </Pressable>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}

          <Text style={[styles.headerTitle, { color: palette.text }]}>{STEPS[currentStep].title}</Text>

          <Pressable onPress={handleLogout} style={[styles.iconBtn, { borderColor: palette.border }]}> 
            <LogOut size={16} color={palette.mutedText} />
          </Pressable>
        </View>

        {currentStep > 0 ? (
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: palette.mutedText }]}>Step {currentStep}</Text>
            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}> 
              <View style={[styles.progressFill, { backgroundColor: palette.primary, width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: palette.mutedText }]}>{Math.round(progress)}%</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <StepComponent onNext={handleNext} onBack={handleBack} data={onboardingData} saving={saving} />
      </View>
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
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconPlaceholder: {
    width: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  progressTrack: {
    borderRadius: 99,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 99,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 10,
  },
});
