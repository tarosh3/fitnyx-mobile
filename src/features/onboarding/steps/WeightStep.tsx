import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Circle } from 'react-native-svg';

import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const PRIMARY = '#5FC793';
const GAUGE_SIZE = 220;
const STROKE_WIDTH = 12;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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

  const progress = useMemo(() => {
    if (unit === 'kg') return (weightKg - 30) / (200 - 30);
    return (weightLbs - 66) / (440 - 66);
  }, [unit, weightKg, weightLbs]);

  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)));

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
      {/* Unit toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => handleUnitChange('kg')}
          style={[styles.toggleBtn, unit === 'kg' ? styles.toggleActive : { backgroundColor: palette.card }]}
        >
          <Text style={[styles.toggleText, { color: unit === 'kg' ? '#000' : palette.text }]}>kg</Text>
        </Pressable>
        <Pressable
          onPress={() => handleUnitChange('lbs')}
          style={[styles.toggleBtn, unit === 'lbs' ? styles.toggleActive : { backgroundColor: palette.card }]}
        >
          <Text style={[styles.toggleText, { color: unit === 'lbs' ? '#000' : palette.text }]}>lbs</Text>
        </Pressable>
      </View>

      {/* Circular gauge */}
      <View style={styles.gaugeContainer}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={styles.gaugeSvg}>
          <Circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={RADIUS}
            stroke={palette.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            opacity={0.3}
          />
          <Circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={RADIUS}
            stroke={PRIMARY}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.gaugeCenter}>
          <Text style={styles.gaugeValue}>{currentWeight}</Text>
          <Text style={[styles.gaugeUnit, { color: palette.mutedText }]}>{unit}</Text>
        </View>
      </View>

      {/* Slider */}
      <View style={styles.sliderWrap}>
        <Text style={[styles.sliderLabel, { color: palette.mutedText }]}>
          {unit === 'kg' ? '30' : '66'}
        </Text>
        <View style={styles.sliderTrack}>
          <Slider
            minimumValue={unit === 'kg' ? 30 : 66}
            maximumValue={unit === 'kg' ? 200 : 440}
            step={1}
            value={currentWeight}
            minimumTrackTintColor={PRIMARY}
            maximumTrackTintColor={palette.border}
            thumbTintColor={PRIMARY}
            onValueChange={(value) => {
              setError('');
              if (unit === 'kg') setWeightKg(Math.round(value));
              else setWeightLbs(Math.round(value));
            }}
          />
        </View>
        <Text style={[styles.sliderLabel, { color: palette.mutedText }]}>
          {unit === 'kg' ? '200' : '440'}
        </Text>
      </View>

      {/* Conversion badge */}
      <View style={styles.conversionBadge}>
        <Text style={[styles.conversionText, { color: palette.mutedText }]}>
          {unit === 'kg' ? `${Math.round(weightKg * 2.205)} lbs` : `${Math.round(weightLbs / 2.205)} kg`}
        </Text>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  toggleBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    paddingVertical: 12,
  },
  toggleActive: {
    backgroundColor: PRIMARY,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gaugeContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    height: GAUGE_SIZE,
    justifyContent: 'center',
    marginVertical: 8,
    width: GAUGE_SIZE,
  },
  gaugeSvg: {
    position: 'absolute',
  },
  gaugeCenter: {
    alignItems: 'center',
  },
  gaugeValue: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
  },
  gaugeUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  sliderWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sliderTrack: {
    flex: 1,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  conversionBadge: {
    alignSelf: 'center',
    borderColor: `${PRIMARY}30`,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: `${PRIMARY}10`,
  },
  conversionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
