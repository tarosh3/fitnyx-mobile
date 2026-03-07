import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export function WeightStep({ data, onNext, saving }: OnboardingStepProps) {
  const palette = useThemeColors();

  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightKg, setWeightKg] = useState(data?.weight || 70);
  const [weightLbs, setWeightLbs] = useState(Math.round((data?.weight || 70) * 2.205));
  const [error, setError] = useState('');

  const currentWeight = unit === 'kg' ? weightKg : weightLbs;

  const handleUnitChange = (nextUnit: 'kg' | 'lbs') => {
    if (nextUnit === 'lbs' && unit === 'kg') {
      setWeightLbs(Math.round(weightKg * 2.205));
    } else if (nextUnit === 'kg' && unit === 'lbs') {
      setWeightKg(Math.round(weightLbs / 2.205));
    }
    setUnit(nextUnit);
  };

  const handleSubmit = () => {
    const finalWeightKg = unit === 'kg' ? weightKg : Math.round(weightLbs / 2.205);
    if (finalWeightKg < 30 || finalWeightKg > 200) {
      setError('Please enter a valid weight (30-200 kg)');
      return;
    }

    onNext({ weight_kg: finalWeightKg });
  };

  return (
    <StepScaffold
      title="What's your weight?"
      subtitle="We use this to calculate calories and customization."
      onContinue={handleSubmit}
      saving={saving}
      error={error}
    >
      <View style={styles.toggleRow}>
        <Text
          onPress={() => handleUnitChange('kg')}
          style={[styles.toggle, { backgroundColor: unit === 'kg' ? palette.primary : palette.card, color: unit === 'kg' ? palette.primaryText : palette.text }]}
        >
          kg
        </Text>
        <Text
          onPress={() => handleUnitChange('lbs')}
          style={[styles.toggle, { backgroundColor: unit === 'lbs' ? palette.primary : palette.card, color: unit === 'lbs' ? palette.primaryText : palette.text }]}
        >
          lbs
        </Text>
      </View>

      <View style={[styles.reading, { borderColor: palette.border, backgroundColor: palette.card }]}> 
        <Text style={{ color: palette.text, fontSize: 46, fontWeight: '800' }}>{currentWeight}</Text>
        <Text style={{ color: palette.mutedText, fontSize: 15, fontWeight: '700' }}>{unit}</Text>
      </View>

      <Slider
        minimumValue={unit === 'kg' ? 30 : 66}
        maximumValue={unit === 'kg' ? 200 : 440}
        step={1}
        value={currentWeight}
        minimumTrackTintColor={palette.primary}
        maximumTrackTintColor={palette.border}
        onValueChange={(value) => {
          setError('');
          if (unit === 'kg') setWeightKg(Math.round(value));
          else setWeightLbs(Math.round(value));
        }}
      />

      <Text style={{ color: palette.mutedText, textAlign: 'center' }}>
        {unit === 'kg' ? `≈ ${Math.round(weightKg * 2.205)} lbs` : `≈ ${Math.round(weightLbs / 2.205)} kg`}
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
