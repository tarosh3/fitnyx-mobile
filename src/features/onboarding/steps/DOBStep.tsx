import React, { useCallback, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelPickerProps {
  items: { label: string; value: number }[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  palette: any;
}

function WheelPicker({ items, selectedValue, onValueChange, palette }: WheelPickerProps) {
  const scrollRef = useRef<Animated.ScrollView>(null);
  const initialIndex = items.findIndex((item) => item.value === selectedValue);
  const initialOffset = Math.max(0, initialIndex) * ITEM_HEIGHT;

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      if (items[clamped]) {
        onValueChange(items[clamped].value);
      }
    },
    [items, onValueChange],
  );

  // Padding so first/last items can be centered
  const topPad = (VISIBLE_ITEMS - 1) / 2 * ITEM_HEIGHT;

  return (
    <View style={[wheelStyles.container, { height: PICKER_HEIGHT }]}>
      {/* Selection highlight */}
      <View
        style={[
          wheelStyles.highlight,
          {
            top: topPad,
            backgroundColor: palette.primary + '18',
            borderColor: palette.primary + '40',
          },
        ]}
        pointerEvents="none"
      />

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: initialOffset }}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: topPad }}
      >
        {items.map((item) => (
          <View key={item.value} style={wheelStyles.item}>
            <Text
              style={[
                wheelStyles.itemText,
                {
                  color: item.value === selectedValue ? '#FFFFFF' : palette.mutedText,
                  fontWeight: item.value === selectedValue ? '700' : '400',
                  fontSize: item.value === selectedValue ? 20 : 16,
                },
              ]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Top/bottom fade gradients */}
      <View style={[wheelStyles.fadeTop, { backgroundColor: palette.card }]} pointerEvents="none" />
      <View style={[wheelStyles.fadeBottom, { backgroundColor: palette.card }]} pointerEvents="none" />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    borderRadius: 12,
    borderWidth: 1,
    height: ITEM_HEIGHT,
    left: 4,
    position: 'absolute',
    right: 4,
    zIndex: 1,
  },
  item: {
    alignItems: 'center',
    height: ITEM_HEIGHT,
    justifyContent: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
  fadeTop: {
    height: ITEM_HEIGHT * 1.2,
    left: 0,
    opacity: 0.7,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  fadeBottom: {
    bottom: 0,
    height: ITEM_HEIGHT * 1.2,
    left: 0,
    opacity: 0.7,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
});

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

  const yearItems = useMemo(() => {
    const result: { label: string; value: number }[] = [];
    for (let y = currentYear - 13; y >= currentYear - 100; y -= 1) {
      result.push({ label: `${y}`, value: y });
    }
    return result;
  }, [currentYear]);

  const monthItems = useMemo(
    () => MONTHS.map((label, index) => ({ label, value: index })),
    [],
  );

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);

  const dayItems = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => ({ label: `${i + 1}`, value: i + 1 })),
    [daysInMonth],
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
        <View style={[styles.column, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Text style={[styles.columnLabel, { color: palette.mutedText }]}>DAY</Text>
          <WheelPicker items={dayItems} selectedValue={day} onValueChange={setDay} palette={palette} />
        </View>

        <View style={[styles.column, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Text style={[styles.columnLabel, { color: palette.mutedText }]}>MONTH</Text>
          <WheelPicker items={monthItems} selectedValue={month} onValueChange={setMonth} palette={palette} />
        </View>

        <View style={[styles.column, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Text style={[styles.columnLabel, { color: palette.mutedText }]}>YEAR</Text>
          <WheelPicker items={yearItems} selectedValue={year} onValueChange={setYear} palette={palette} />
        </View>
      </View>

      <View style={[styles.ageBadge, { backgroundColor: palette.primary + '15', borderColor: palette.primary + '30' }]}>
        <Text style={[styles.ageText, { color: palette.mutedText }]}>
          You are <Text style={{ color: palette.primary, fontWeight: '800' }}>{computedAge}</Text> years old
        </Text>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  column: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
    paddingTop: 10,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ageBadge: {
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ageText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
