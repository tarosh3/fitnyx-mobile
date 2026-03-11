import { Check, ChevronRight, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { sanitizeGeneralText, MAX_SHORT_TEXT, MAX_MEDIUM_TEXT, MAX_LONG_TEXT } from '@/src/lib/validators';

interface DietWizardProps {
  onComplete: (preferences: any) => void;
  isLoading: boolean;
}

const NEON_LIME = '#5fc793';
const STEPS = ['GOALS', 'ACTIVITY', 'HEALTH'];

export function DietWizard({ onComplete, isLoading }: DietWizardProps) {
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState({
    goal: 'weight_loss',
    diet_type: 'non_vegetarian',
    activity_level: 'lightly_active',
    meals_per_day: '3',
    allergies: [] as string[],
    medical_conditions: '',
    dislikes: '',
    feedback: '',
    state: '',
  });

  const update = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }
    onComplete(preferences);
  };

  const back = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CREATE YOUR PLAN</Text>
        <Text style={styles.subtitle}>Answer a few questions for a tailored experience</Text>
      </View>

      {/* Modern Step Indicator */}
      <View style={styles.stepIndicatorContainer}>
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <View key={step} style={styles.stepWrapper}>
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted
              ]}>
                {isCompleted ? (
                  <Check size={12} color="#000" strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepNumber, isActive && { color: '#000' }]}>{idx + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepText, isActive && styles.stepTextActive]}>{step}</Text>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepLine, isCompleted && { backgroundColor: NEON_LIME }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {currentStep === 0 ? (
          <View style={{ gap: 24 }}>
            <OptionGroup
              title="Primary fitness goal"
              value={preferences.goal}
              onChange={(value) => update('goal', value)}
              options={[
                ['weight_loss', 'Lose Weight'],
                ['maintenance', 'Maintain Weight'],
                ['muscle_gain', 'Gain Muscle'],
                ['energy', 'Boost Energy'],
              ]}
            />

            <OptionGroup
              title="Dietary preference"
              value={preferences.diet_type}
              onChange={(value) => update('diet_type', value)}
              options={[
                ['non_vegetarian', 'Non-Vegetarian'],
                ['vegetarian', 'Vegetarian'],
                ['vegan', 'Vegan'],
                ['eggetarian', 'Eggetarian'],
                ['keto', 'Keto'],
                ['paleo', 'Paleo'],
              ]}
            />

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Your State / Region</Text>
              <Input
                value={preferences.state}
                onChangeText={(value) => update('state', value)}
                placeholder="e.g. Maharashtra, California"
                sanitize={(v) => sanitizeGeneralText(v, MAX_SHORT_TEXT)}
                maxLength={MAX_SHORT_TEXT}
                style={{ backgroundColor: palette.card, borderColor: palette.border, color: palette.text }}
              />
            </View>
          </View>
        ) : null}

        {currentStep === 1 ? (
          <View style={{ gap: 24 }}>
            <OptionGroup
              title="Activity level"
              value={preferences.activity_level}
              onChange={(value) => update('activity_level', value)}
              options={[
                ['sedentary', 'Sedentary'],
                ['lightly_active', 'Lightly Active'],
                ['active', 'Active'],
                ['very_active', 'Very Active'],
              ]}
            />

            <OptionGroup
              title="Meals per day"
              value={preferences.meals_per_day}
              onChange={(value) => update('meals_per_day', value)}
              options={[
                ['2', '2'],
                ['3', '3'],
                ['4', '4'],
                ['5', '5'],
                ['6', '6'],
              ]}
            />
          </View>
        ) : null}

        {currentStep === 2 ? (
          <View style={{ gap: 24 }}>
            <CheckboxGroup
              title="Allergies (multiple)"
              values={preferences.allergies}
              onChange={(nextValues) => update('allergies', nextValues)}
              options={['Peanuts', 'Tree Nuts', 'Dairy', 'Gluten', 'Soy', 'Shellfish', 'Eggs']}
            />

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Medical Conditions</Text>
              <Input
                value={preferences.medical_conditions}
                onChangeText={(value) => update('medical_conditions', value)}
                placeholder="e.g. Diabetes, PCOS"
                sanitize={(v) => sanitizeGeneralText(v, MAX_MEDIUM_TEXT)}
                maxLength={MAX_MEDIUM_TEXT}
                style={{ backgroundColor: palette.card, borderColor: palette.border, color: palette.text }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Foods you dislike</Text>
              <Input
                value={preferences.dislikes}
                onChangeText={(value) => update('dislikes', value)}
                placeholder="e.g. Mushrooms"
                sanitize={(v) => sanitizeGeneralText(v, MAX_MEDIUM_TEXT)}
                maxLength={MAX_MEDIUM_TEXT}
                style={{ backgroundColor: palette.card, borderColor: palette.border, color: palette.text }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.label}>Specific requirements</Text>
                <Info size={12} color={palette.mutedText} />
              </View>
              <Input
                value={preferences.feedback}
                onChangeText={(value) => update('feedback', value)}
                placeholder="High protein, replace X with Y..."
                multiline
                numberOfLines={4}
                sanitize={(v) => sanitizeGeneralText(v, MAX_LONG_TEXT)}
                maxLength={MAX_LONG_TEXT}
                style={styles.textArea}
              />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {currentStep > 0 && (
          <Pressable
            onPress={back}
            disabled={isLoading}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtnText}>BACK</Text>
          </Pressable>
        )}
        <Pressable
          onPress={next}
          disabled={isLoading}
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.9, scale: 0.99 }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {currentStep === STEPS.length - 1 ? 'GENERATE PLAN' : 'CONTINUE'}
              </Text>
              <ChevronRight color="#000" size={18} strokeWidth={3} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function OptionGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (next: string) => void;
}) {
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.optionWrap}>
        {options.map(([id, label]) => {
          const active = value === id;
          return (
            <Pressable
              key={id}
              onPress={() => onChange(id)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && { opacity: 0.8, scale: 0.98 }
              ]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CheckboxGroup({
  title,
  options,
  values,
  onChange,
}: {
  title: string;
  options: string[];
  values: string[];
  onChange: (nextValues: string[]) => void;
}) {
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  const toggle = (option: string) => {
    if (values.includes(option)) {
      onChange(values.filter((v) => v !== option));
      return;
    }
    onChange([...values, option]);
  };

  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.optionWrap}>
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggle(option)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && { opacity: 0.8 }
              ]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    color: palette.mutedText,
    fontSize: 13,
    fontWeight: '500',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  stepWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  stepCircleActive: {
    backgroundColor: NEON_LIME,
    borderColor: NEON_LIME,
    shadowColor: NEON_LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  stepCircleCompleted: {
    backgroundColor: NEON_LIME,
    borderColor: NEON_LIME,
  },
  stepNumber: {
    color: palette.mutedText,
    fontSize: 11,
    fontWeight: '900',
  },
  stepText: {
    color: palette.mutedText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepTextActive: {
    color: NEON_LIME,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
    marginRight: 8,
  },
  formContainer: {
    gap: 24,
  },
  group: {
    gap: 12,
  },
  groupLabel: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  optionActive: {
    backgroundColor: 'rgba(128, 242, 13, 0.05)',
    borderColor: NEON_LIME,
  },
  optionText: {
    color: palette.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextActive: {
    color: NEON_LIME,
    fontWeight: '800',
  },
  label: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textArea: {
    minHeight: 100,
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    color: palette.text,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  nextBtn: {
    flex: 2,
    backgroundColor: NEON_LIME,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  nextBtnText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  backBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  backBtnText: {
    color: palette.mutedText,
    fontSize: 15,
    fontWeight: '700',
  },
});
