import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Circle } from 'react-native-svg';

import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fmtWeight, limitDecimals } from '@/src/lib/decimal';
import { kgToLbs, lbsToKg } from '@/src/lib/prefs';

const PRIMARY = '#5FC793';
const GAUGE_SIZE = 220;
const STROKE_WIDTH = 12;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function WeightStep({ data, onNext, saving }: OnboardingStepProps) {
  const palette = useThemeColors();

  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  // The weight in kg, to 2 decimals (what the backend stores); the box shows it in `unit`.
  const [weightKg, setWeightKg] = useState(data?.weight_kg || 70);
  const [text, setText] = useState(fmtWeight(data?.weight_kg || 70));
  const [error, setError] = useState('');

  const inUnit = (kg: number, u = unit) => (u === 'kg' ? kg : kgToLbs(kg));
  const currentWeight = round2(inUnit(weightKg));

  const handleUnitChange = (nextUnit: 'kg' | 'lbs') => {
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

  const progress = useMemo(() => {
    if (unit === 'kg') return (weightKg - 30) / (200 - 30);
    return (kgToLbs(weightKg) - 66) / (440 - 66);
  }, [unit, weightKg]);

  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)));

  const handleSubmit = () => {
    const finalWeightKg = round2(weightKg);
    if (!text || finalWeightKg < 30 || finalWeightKg > 200) {
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
          <TextInput
            testID="weight-input"
            value={text}
            onChangeText={handleType}
            keyboardType="decimal-pad"
            selectTextOnFocus
            maxLength={6}
            accessibilityLabel={`Weight in ${unit === 'kg' ? 'kilograms' : 'pounds'}`}
            style={[styles.gaugeValue, { color: palette.text }]}
          />
          <Text style={[styles.gaugeUnit, { color: palette.mutedText }]}>{unit} · tap to type</Text>
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
              const whole = Math.round(value);
              setText(String(whole));
              setWeightKg(round2(unit === 'kg' ? whole : lbsToKg(whole)));
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
          {unit === 'kg' ? `${fmtWeight(kgToLbs(weightKg))} lbs` : `${fmtWeight(weightKg)} kg`}
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
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
    minWidth: 120,
    padding: 0,
    textAlign: 'center',
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
