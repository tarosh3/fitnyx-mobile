import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { RulerPicker } from '@/src/features/onboarding/RulerPicker';
import { nudge } from '@/src/features/onboarding/ruler';
import { measureStyles, StepButton, UnitToggle } from '@/src/features/onboarding/steps/MeasureParts';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';

type Unit = 'cm' | 'ft';

// cm: a tick per cm, labelled every 10. ft: a tick per inch, labelled every foot.
const RULER = {
  cm: { min: 100, max: 250, step: 1, ticksPerLabel: 10 },
  ft: { min: 36, max: 96, step: 1, ticksPerLabel: 12 },
} as const;
const UNITS = [{ value: 'cm' as const, label: 'cm' }, { value: 'ft' as const, label: 'ft / in' }];

const cmToIn = (cm: number) => Math.round(cm / 2.54);
const inToCm = (inches: number) => Math.round(inches * 2.54);
const ftIn = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;
const cmLabel = (n: number) => String(n);
const ftLabel = (n: number) => `${Math.floor(n / 12)}'`;

export function HeightStep({ data, onNext, saving }: OnboardingStepProps) {
  const palette = useThemeColors();

  const [unit, setUnit] = useState<Unit>('cm');
  // Whole cm is what the backend stores; ft mode edits whole inches.
  const [heightCm, setHeightCm] = useState(Math.round(data?.height_cm || 170));
  const [inches, setInches] = useState(cmToIn(data?.height_cm || 170));
  const [text, setText] = useState(String(Math.round(data?.height_cm || 170)));
  const [error, setError] = useState('');

  const ruler = RULER[unit];
  const shown = unit === 'cm' ? heightCm : inches;

  const setShown = (value: number) => {
    setError('');
    if (unit === 'cm') {
      setHeightCm(value);
      setText(String(value));
    } else {
      setInches(value);
    }
  };

  const handleUnitChange = (nextUnit: Unit) => {
    if (nextUnit === unit) return;
    if (nextUnit === 'ft') {
      setInches(cmToIn(heightCm));
    } else {
      const cm = inToCm(inches);
      setHeightCm(cm);
      setText(String(cm));
    }
    setUnit(nextUnit);
  };

  const handleType = (raw: string) => {
    setError('');
    const t = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setText(t);
    if (t) setHeightCm(parseInt(t, 10));
  };

  const handleSubmit = () => {
    const finalCm = unit === 'cm' ? heightCm : inToCm(inches);
    if ((unit === 'cm' && !text) || finalCm < 100 || finalCm > 250) {
      setError('Please enter a valid height (100-250 cm)');
      return;
    }
    onNext({ height_cm: finalCm });
  };

  const stepLabel = unit === 'cm' ? '1 centimetre' : '1 inch';

  return (
    <StepScaffold
      title="What's your height?"
      subtitle="This helps calculate your fitness metrics."
      onContinue={handleSubmit}
      saving={saving}
      error={error}
    >
      <UnitToggle options={UNITS} value={unit} onChange={handleUnitChange} />

      <View style={measureStyles.valueRow}>
        <StepButton
          kind="minus"
          accessibilityLabel={`Decrease by ${stepLabel}`}
          disabled={shown <= ruler.min}
          onPress={() => setShown(nudge(shown, -1, ruler.min, ruler.max, ruler.step))}
        />
        <View style={measureStyles.valueBox}>
          {unit === 'cm' ? (
            <TextInput
              testID="height-input"
              value={text}
              onChangeText={handleType}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={3}
              accessibilityLabel="Height in centimetres"
              style={[measureStyles.value, { color: palette.text }]}
            />
          ) : (
            <Text testID="height-value" style={[measureStyles.value, { color: palette.text }]}>{ftIn(inches)}</Text>
          )}
          <Text style={[measureStyles.unit, { color: palette.mutedText }]}>
            {unit === 'cm' ? `cm · ≈ ${ftIn(cmToIn(heightCm))}` : `ft / in · ≈ ${inToCm(inches)} cm`}
          </Text>
        </View>
        <StepButton
          kind="plus"
          accessibilityLabel={`Increase by ${stepLabel}`}
          disabled={shown >= ruler.max}
          onPress={() => setShown(nudge(shown, 1, ruler.min, ruler.max, ruler.step))}
        />
      </View>

      <RulerPicker
        key={unit}
        {...ruler}
        value={Math.max(ruler.min, Math.min(ruler.max, shown))}
        onChange={setShown}
        formatLabel={unit === 'cm' ? cmLabel : ftLabel}
        formatSpoken={(v) => (unit === 'cm' ? `${v} centimetres` : `${Math.floor(v / 12)} feet ${v % 12} inches`)}
        accessibilityLabel="Height ruler"
      />
      <Text style={[measureStyles.hint, { color: palette.mutedText }]}>
        {unit === 'cm' ? 'Slide the ruler, use − / +, or tap the number to type.' : 'Slide the ruler or use − / + (1 inch each).'}
      </Text>
    </StepScaffold>
  );
}
