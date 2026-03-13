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

  // Progress for the ring (0-1)
  const progress = useMemo(() => {
    if (unit === 'cm') return (heightCm - 100) / (250 - 100);
    return (totalInches - 36) / (96 - 36);
  }, [unit, heightCm, totalInches]);

  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)));

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
      {/* Unit toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => handleUnitChange('cm')}
          style={[styles.toggleBtn, unit === 'cm' ? styles.toggleActive : { backgroundColor: palette.card }]}
        >
          <Text style={[styles.toggleText, { color: unit === 'cm' ? '#000' : palette.text }]}>cm</Text>
        </Pressable>
        <Pressable
          onPress={() => handleUnitChange('ft')}
          style={[styles.toggleBtn, unit === 'ft' ? styles.toggleActive : { backgroundColor: palette.card }]}
        >
          <Text style={[styles.toggleText, { color: unit === 'ft' ? '#000' : palette.text }]}>ft / in</Text>
        </Pressable>
      </View>

      {/* Circular gauge */}
      <View style={styles.gaugeContainer}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={styles.gaugeSvg}>
          {/* Background ring */}
          <Circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={RADIUS}
            stroke={palette.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            opacity={0.3}
          />
          {/* Progress ring */}
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
          <Text style={styles.gaugeValue}>
            {unit === 'cm' ? `${heightCm}` : `${feet}'${inches}"`}
          </Text>
          <Text style={[styles.gaugeUnit, { color: palette.mutedText }]}>
            {unit === 'cm' ? 'cm' : 'ft / in'}
          </Text>
        </View>
      </View>

      {/* Slider */}
      <View style={styles.sliderWrap}>
        <Text style={[styles.sliderLabel, { color: palette.mutedText }]}>
          {unit === 'cm' ? '100' : "3'0\""}
        </Text>
        <View style={styles.sliderTrack}>
          <Slider
            minimumValue={unit === 'cm' ? 100 : 36}
            maximumValue={unit === 'cm' ? 250 : 96}
            step={1}
            value={unit === 'cm' ? heightCm : totalInches}
            minimumTrackTintColor={PRIMARY}
            maximumTrackTintColor={palette.border}
            thumbTintColor={PRIMARY}
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
        </View>
        <Text style={[styles.sliderLabel, { color: palette.mutedText }]}>
          {unit === 'cm' ? '250' : "8'0\""}
        </Text>
      </View>

      {/* Conversion badge */}
      <View style={styles.conversionBadge}>
        <Text style={[styles.conversionText, { color: palette.mutedText }]}>
          {unit === 'cm'
            ? `${cmToFtIn(heightCm).feet}'${cmToFtIn(heightCm).inches}"`
            : `${Math.round(ftInToCm(feet, inches))} cm`}
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
