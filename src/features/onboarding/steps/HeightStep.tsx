import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';

function cmToFtIn(cm: number) {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

function ftInToCm(feet: number, inches: number) {
  return (feet * 12 + inches) * 2.54;
}

export function HeightStep({ data, onNext, saving }: OnboardingStepProps) {
  const palette = useThemeColors();

  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const initCm = data?.height || 170;
  const initFtIn = cmToFtIn(initCm);

  const [heightCm, setHeightCm] = useState(initCm);
  const [feet, setFeet] = useState(initFtIn.feet);
  const [inches, setInches] = useState(initFtIn.inches);
  const [error, setError] = useState('');

  const totalInches = useMemo(() => feet * 12 + inches, [feet, inches]);

  const handleUnitChange = (nextUnit: 'cm' | 'ft') => {
    if (nextUnit === 'ft' && unit === 'cm') {
      const converted = cmToFtIn(heightCm);
      setFeet(converted.feet);
      setInches(converted.inches);
    } else if (nextUnit === 'cm' && unit === 'ft') {
      setHeightCm(Math.round(ftInToCm(feet, inches)));
    }
    setUnit(nextUnit);
  };

  const handleSubmit = () => {
    const finalCm = unit === 'cm' ? heightCm : ftInToCm(feet, inches);
    if (finalCm < 100 || finalCm > 250) {
      setError('Please enter a valid height (100-250 cm)');
      return;
    }

    onNext({ height_cm: Math.round(finalCm) });
  };

  return (
    <StepScaffold
      title="What's your height?"
      subtitle="This helps calculate your fitness metrics."
      onContinue={handleSubmit}
      saving={saving}
      error={error}
    >
      <View style={styles.toggleRow}>
        <Text
          onPress={() => handleUnitChange('cm')}
          style={[styles.toggle, { backgroundColor: unit === 'cm' ? palette.primary : palette.card, color: unit === 'cm' ? palette.primaryText : palette.text }]}
        >
          cm
        </Text>
        <Text
          onPress={() => handleUnitChange('ft')}
          style={[styles.toggle, { backgroundColor: unit === 'ft' ? palette.primary : palette.card, color: unit === 'ft' ? palette.primaryText : palette.text }]}
        >
          ft / in
        </Text>
      </View>

      <View style={[styles.reading, { borderColor: palette.border, backgroundColor: palette.card }]}> 
        <Text style={{ color: palette.text, fontSize: 46, fontWeight: '800' }}>
          {unit === 'cm' ? `${heightCm}` : `${feet}'${inches}"`}
        </Text>
      </View>

      <Slider
        minimumValue={unit === 'cm' ? 100 : 36}
        maximumValue={unit === 'cm' ? 250 : 96}
        step={1}
        value={unit === 'cm' ? heightCm : totalInches}
        minimumTrackTintColor={palette.primary}
        maximumTrackTintColor={palette.border}
        onValueChange={(value) => {
          setError('');
          if (unit === 'cm') {
            setHeightCm(Math.round(value));
          } else {
            const total = Math.round(value);
            setFeet(Math.floor(total / 12));
            setInches(total % 12);
          }
        }}
      />

      <Text style={{ color: palette.mutedText, textAlign: 'center' }}>
        {unit === 'cm'
          ? `≈ ${cmToFtIn(heightCm).feet}'${cmToFtIn(heightCm).inches}"`
          : `≈ ${Math.round(ftInToCm(feet, inches))} cm`}
      </Text>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    borderRadius: 12,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    overflow: 'hidden',
    paddingVertical: 10,
    textAlign: 'center',
  },
  reading: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 10,
    paddingVertical: 16,
  },
});
