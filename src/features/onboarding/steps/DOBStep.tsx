import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function DOBStep({ data, onNext, saving }: OnboardingStepProps) {
  const palette = useThemeColors();
  const today = new Date();
  const currentYear = today.getFullYear();

  const initialDate = () => {
    if (data?.dob) {
      const date = new Date(data.dob);
      return { day: date.getDate(), month: date.getMonth(), year: date.getFullYear() };
    }
    return { day: 1, month: 0, year: currentYear - 25 };
  };

  const initial = initialDate();
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [error, setError] = useState('');

  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = currentYear - 13; y >= currentYear - 100; y -= 1) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);

  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const handleSubmit = () => {
    const age = currentYear - year;

    if (age < 13) {
      setError('You must be at least 13 years old');
      return;
    }

    if (age > 100) {
      setError('Please enter a valid date');
      return;
    }

    const dob = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onNext({ dob });
  };

  const computedAge = (() => {
    const birthDate = new Date(year, month, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  })();

  return (
    <StepScaffold
      title="When were you born?"
      subtitle="This helps us personalize your workouts based on your age."
      onContinue={handleSubmit}
      saving={saving}
      error={error}
    >
      <View style={styles.pickerRow}>
        <View style={[styles.pickerWrap, { borderColor: palette.border, backgroundColor: palette.card }]}> 
          <Text style={[styles.pickerLabel, { color: palette.mutedText }]}>Day</Text>
          <Picker selectedValue={day} onValueChange={(value) => setDay(Number(value))} style={{ color: palette.text }}>
            {days.map((value) => (
              <Picker.Item key={value} label={`${value}`} value={value} />
            ))}
          </Picker>
        </View>

        <View style={[styles.pickerWrap, { borderColor: palette.border, backgroundColor: palette.card }]}> 
          <Text style={[styles.pickerLabel, { color: palette.mutedText }]}>Month</Text>
          <Picker selectedValue={month} onValueChange={(value) => setMonth(Number(value))} style={{ color: palette.text }}>
            {MONTHS.map((label, index) => (
              <Picker.Item key={label} label={label.slice(0, 3)} value={index} />
            ))}
          </Picker>
        </View>

        <View style={[styles.pickerWrap, { borderColor: palette.border, backgroundColor: palette.card }]}> 
          <Text style={[styles.pickerLabel, { color: palette.mutedText }]}>Year</Text>
          <Picker selectedValue={year} onValueChange={(value) => setYear(Number(value))} style={{ color: palette.text }}>
            {years.map((value) => (
              <Picker.Item key={value} label={`${value}`} value={value} />
            ))}
          </Picker>
        </View>
      </View>

      <Text style={[styles.ageText, { color: palette.mutedText }]}> 
        You are <Text style={{ color: palette.primary, fontWeight: '700' }}>{computedAge}</Text> years old
      </Text>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerWrap: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingLeft: 12,
    paddingTop: 10,
    textTransform: 'uppercase',
  },
  ageText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});
