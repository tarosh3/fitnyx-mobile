import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Rules come from the referral overview, never from decorative progress milestones. */
export function HowItWorks({ needed, cost, days }: { needed: number; cost: number; days: number }) {
  const c = useThemeColors();
  const steps = [
    ['Send a little motivation', 'A friend signs up and enters your code in their first 14 days.'],
    ['They find their rhythm', `They finish a workout or a Roam on ${needed} different days.`],
    ['Their effort. Your Spark.', `You get 1 Spark. ${cost} Sparks = ${days} days of Pro, added to any Pro you have.`],
  ];
  return (
    <View style={styles.wrap} testID="referral-how">
      <Text style={[styles.eyebrow, { color: c.accent }]}>FROM INVITE TO REWARD</Text>
      <Text accessibilityRole="header" style={[styles.heading, { color: c.text }]}>Good things add up.</Text>
      <View style={styles.journey}>
        {steps.map(([title, body], i) => (
          <View key={title} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.num, { backgroundColor: i === 2 ? c.primary : c.accentSoft }]}><Text style={[styles.numText, { color: i === 2 ? c.primaryText : c.accent }]}>0{i + 1}</Text></View>
              {i < 2 ? <View style={[styles.line, { backgroundColor: c.border }]} /> : null}
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: c.text }]}>{title}</Text>
              <Text style={[styles.text, { color: c.mutedText }]}>{body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={[styles.fine, { color: c.mutedText }]}>Each person can be referred once. You can't use your own code, and two friends can't refer each other. Sparks don't expire.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1.6, lineHeight: 16 },
  heading: { fontFamily: type.weight.extrabold, fontSize: 26, letterSpacing: -0.8, marginTop: spacing.sm },
  journey: { marginTop: spacing.xl },
  step: { flexDirection: 'row', gap: spacing.base },
  rail: { width: 36, alignItems: 'center' },
  num: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: type.weight.bold, fontSize: 12 },
  line: { width: 1, flex: 1, marginVertical: 5 },
  copy: { flex: 1, paddingBottom: spacing.xl, gap: spacing.xs },
  title: { fontFamily: type.weight.bold, fontSize: 15, lineHeight: 22, paddingTop: 6 },
  text: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 20 },
  fine: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 19 },
});
