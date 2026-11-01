import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { RulerPicker } from '@/src/features/onboarding/RulerPicker';
import { nudge } from '@/src/features/onboarding/ruler';
import { measureStyles, StepButton, UnitToggle } from '@/src/features/onboarding/steps/MeasureParts';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fmtWeight, limitDecimals } from '@/src/lib/decimal';
import { kgToLbs, lbsToKg } from '@/src/lib/prefs';

type Unit = 'kg' | 'lbs';

// Ruler per unit: 0.1 kg / 0.2 lb ticks (bathroom-scale precision), a label each whole unit.
const RULER = {
  kg: { min: 30, max: 200, step: 0.1, ticksPerLabel: 10 },
  lbs: { min: 66, max: 440, step: 0.2, ticksPerLabel: 5 },
} as const;
const UNITS = [{ value: 'kg' as const, label: 'kg' }, { value: 'lbs' as const, label: 'lbs' }];

const round2 = (n: number) => Math.round(n * 100) / 100;
const label = (n: number) => String(Math.round(n));

export function WeightStep({ data, onNext, saving }: OnboardingStepProps) {
  const palette = useThemeColors();

  const [unit, setUnit] = useState<Unit>('kg');
  // The weight in kg, to 2 decimals (what the backend stores); the box shows it in `unit`.
  const [weightKg, setWeightKg] = useState(data?.weight_kg || 70);
  const [text, setText] = useState(fmtWeight(data?.weight_kg || 70));
  const [error, setError] = useState('');

  const inUnit = (kg: number, u: Unit = unit) => (u === 'kg' ? kg : kgToLbs(kg));
  const ruler = RULER[unit];
  // The ruler follows the box (typed 72.45 stays 72.45; the ruler shows the nearest tick).
  const typed = parseFloat(text);
  const shown = Number.isFinite(typed) ? typed : round2(inUnit(weightKg));

  const setShown = (value: number) => {
    setError('');
    setText(fmtWeight(value));
    setWeightKg(round2(unit === 'kg' ? value : lbsToKg(value)));
  };

  const handleUnitChange = (nextUnit: Unit) => {
    setUnit(nextUnit);
    setText(fmtWeight(inUnit(weightKg, nextUnit)));
  };

  const handleType = (raw: string) => {
    setError('');
    const t = limitDecimals(raw);
    setText(t);
    const n = parseFloat(t);
    if (Number.isFinite(n)) setWeightKg(round2(unit === 'kg' ? n : lbsToKg(n)));
  };

  const handleSubmit = () => {
    const finalWeightKg = round2(weightKg);
    if (!text || finalWeightKg < 30 || finalWeightKg > 200) {
      setError('Please enter a valid weight (30-200 kg)');
      return;
    }
    onNext({ weight_kg: finalWeightKg });
  };

  const unitName = unit === 'kg' ? 'kilograms' : 'pounds';

  return (
    <StepScaffold
      title="What's your weight?"
      subtitle="We use this to calculate calories and customization."
      onContinue={handleSubmit}
      saving={saving}
      error={error}
    >
      <UnitToggle options={UNITS} value={unit} onChange={handleUnitChange} />

      <View style={measureStyles.valueRow}>
        <StepButton
          kind="minus"
          accessibilityLabel={`Decrease by ${ruler.step} ${unit}`}
          disabled={shown <= ruler.min}
          onPress={() => setShown(nudge(shown, -1, ruler.min, ruler.max, ruler.step))}
        />
        <View style={measureStyles.valueBox}>
          <TextInput
            testID="weight-input"
            value={text}
            onChangeText={handleType}
            keyboardType="decimal-pad"
            selectTextOnFocus
            maxLength={6}
            accessibilityLabel={`Weight in ${unitName}`}
            style={[measureStyles.value, { color: palette.text }]}
          />
          <Text style={[measureStyles.unit, { color: palette.mutedText }]}>
            {unit} · ≈ {unit === 'kg' ? `${fmtWeight(kgToLbs(weightKg))} lbs` : `${fmtWeight(weightKg)} kg`}
          </Text>
        </View>
        <StepButton
          kind="plus"
          accessibilityLabel={`Increase by ${ruler.step} ${unit}`}
          disabled={shown >= ruler.max}
          onPress={() => setShown(nudge(shown, 1, ruler.min, ruler.max, ruler.step))}
        />
      </View>

      <RulerPicker
        key={unit}
        {...ruler}
        value={Math.max(ruler.min, Math.min(ruler.max, shown))}
        onChange={setShown}
        formatLabel={label}
        formatSpoken={(v) => `${fmtWeight(v)} ${unitName}`}
        accessibilityLabel="Weight ruler"
      />
      <Text style={[measureStyles.hint, { color: palette.mutedText }]}>
        Slide the ruler, use − / +, or tap the number to type (decimals ok).
      </Text>
    </StepScaffold>
  );
}
