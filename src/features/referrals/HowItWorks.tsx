import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** The rules, in three steps. Mirrors backend internal/referral. */
export function HowItWorks({ needed, cost, days }: { needed: number; cost: number; days: number }) {
  const c = useThemeColors();
  const steps = [
    'A friend signs up and enters your code in their first 14 days.',
    `They finish a workout or a Roam on ${needed} different days.`,
    `You get 1 Spark. ${cost} Sparks = ${days} days of Pro, added to any Pro you have.`,
  ];
  return (
    <View style={styles.wrap} testID="referral-how">
      <Text style={[styles.heading, { color: c.text }]}>How it works</Text>
      {steps.map((s, i) => (
        <View key={s} style={styles.step}>
          <View style={[styles.num, { backgroundColor: c.accentSoft }]}><Text style={[styles.numText, { color: c.accent }]}>{i + 1}</Text></View>
          <Text style={[styles.text, { color: c.mutedText }]}>{s}</Text>
        </View>
      ))}
      <Text style={[styles.fine, { color: c.mutedText }]}>
        Each person can be referred once. You can't use your own code, and two friends can't refer each other. Sparks don't expire.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  heading: { fontFamily: type.weight.semibold, fontSize: 17 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  num: { width: 26, height: 26, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: type.weight.bold, fontSize: 13 },
  text: { flex: 1, fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, paddingTop: 2 },
  fine: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18 },
});
