import { Check, ChevronRight, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { type } from '@/src/styles/tokens';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { sanitizeGeneralText, MAX_SHORT_TEXT, MAX_MEDIUM_TEXT, MAX_LONG_TEXT } from '@/src/lib/validators';

interface DietWizardProps {
  onComplete: (preferences: any) => void;
  isLoading: boolean;
  /** Plan generation needs the AI; offline, the final step can't submit. */
  offline?: boolean;
  onStepChange?: () => void;
  /** Starting answers from the plan (onboarding goal, activity, diet type). */
  initial?: { goal?: string; activity_level?: string; diet_type?: string };
}

const STEPS = ['Your goals', 'Your routine', 'Your preferences'];
const TITLES = ['A plan that fits your life.', 'Make it work for your day.', 'The details make it yours.'];
const DESCRIPTIONS = ['Start with your goal and the food you enjoy.', 'Tell us how you move and when you like to eat.', 'Add allergies, dislikes and anything else to consider.'];

export function DietWizard({ onComplete, isLoading, offline, onStepChange, initial }: DietWizardProps) {
  const palette = useThemeColors();
  const { fontScale } = useWindowDimensions();
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

  const touched = React.useRef(false);
  // The plan can arrive after the wizard opens; apply it until the user picks something.
  React.useEffect(() => {
    if (touched.current || !initial) return;
    setPreferences((prev) => ({
      ...prev,
      ...(initial.goal ? { goal: initial.goal } : {}),
      ...(initial.activity_level ? { activity_level: initial.activity_level } : {}),
      ...(initial.diet_type ? { diet_type: initial.diet_type } : {}),
    }));
  }, [initial?.goal, initial?.activity_level, initial?.diet_type]);

  const update = (key: string, value: any) => {
    touched.current = true;
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      onStepChange?.();
      return;
    }
    onComplete(preferences);
  };

  const back = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      onStepChange?.();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepIndicatorContainer} accessible accessibilityLabel={`Step ${currentStep + 1} of 3: ${STEPS[currentStep]}`}>
        <View style={styles.progressLabels}><Text style={styles.stepTextActive}>{STEPS[currentStep]}</Text><Text style={styles.stepText}>{currentStep + 1} / 3</Text></View>
        <View style={styles.progressTrack}>{STEPS.map((step, idx) => <View key={step} style={[styles.progressSegment, { backgroundColor: idx <= currentStep ? palette.accent : palette.border }]} />)}</View>
      </View>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={styles.title} accessibilityRole="header">{TITLES[currentStep]}</Text>
          <Text style={styles.subtitle}>{DESCRIPTIONS[currentStep]}</Text>
        </View>
        {currentStep === 0 && fontScale < 1.3 ? <Image source={require('../../../assets/images/nutrition/fuel-bowl.png')} style={{ width: 88, height: 88 }} accessible={false} /> : null}
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
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
            onPress={back}
            disabled={isLoading}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        )}
        {(() => {
          // The last step submits to the AI, so it can't run offline — disable
          // it and say why rather than letting the tap fail with an error.
          const lastStep = currentStep === STEPS.length - 1;
          const blockedOffline = lastStep && !!offline;
          const isDisabled = isLoading || blockedOffline;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isDisabled, busy: isLoading }}
              onPress={next}
              disabled={isDisabled}
              style={({ pressed }) => [styles.nextBtn, isDisabled && { opacity: 0.6 }, pressed && { opacity: 0.9, scale: 0.99 }]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={palette.primaryText} />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {blockedOffline ? 'Offline — connect to create' : lastStep ? 'Create my plan' : 'Continue'}
                  </Text>
                  {!blockedOffline ? <ChevronRight color={palette.primaryText} size={18} strokeWidth={3} /> : null}
                </>
              )}
            </Pressable>
          );
        })()}
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
  const numeric = options.every(([id]) => /^\d+$/.test(id));
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.optionWrap}>
        {options.map(([id, label]) => {
          const active = value === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(id)}
              style={({ pressed }) => [
                styles.option,
                numeric && styles.numberOption,
                active && styles.optionActive,
                pressed && { opacity: 0.8, scale: 0.98 }
              ]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {label}
              </Text>
              {!numeric ? active ? <Check size={16} color={palette.accent} /> : <View style={styles.unchecked} /> : null}
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
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
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
              {active ? <Check size={16} color={palette.accent} /> : <View style={styles.unchecked} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { paddingHorizontal: 4 },
  stepIndicatorContainer: { gap: 12, marginTop: 12, marginBottom: 28 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepText: { color: palette.mutedText, fontFamily: type.weight.semibold, fontSize: 12 },
  stepTextActive: { color: palette.accent, fontFamily: type.weight.bold, fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  title: { color: palette.text, fontFamily: type.weight.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
  subtitle: { color: palette.mutedText, fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21 },
  formContainer: { gap: 24 },
  group: { gap: 12 },
  groupLabel: { color: palette.text, fontFamily: type.weight.bold, fontSize: 16 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 56, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  numberOption: { flexBasis: 0, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  optionActive: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
  optionText: { color: palette.mutedText, fontFamily: type.weight.medium, fontSize: 14, flexShrink: 1 },
  optionTextActive: { color: palette.accent, fontFamily: type.weight.bold },
  unchecked: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: palette.border },
  label: { color: palette.text, fontFamily: type.weight.semibold, fontSize: 14 },
  textArea: { minHeight: 100, backgroundColor: palette.card, borderRadius: 16, borderWidth: 1, borderColor: palette.border, padding: 16, color: palette.text, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28, marginBottom: 24 },
  nextBtn: { flex: 2, backgroundColor: palette.primary, minHeight: 56, paddingVertical: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  nextBtnText: { color: palette.primaryText, fontFamily: type.weight.bold, fontSize: 16 },
  backBtn: { flex: 1, minHeight: 56, borderRadius: 18, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  backBtnText: { color: palette.text, fontFamily: type.weight.semibold, fontSize: 15 },
});
