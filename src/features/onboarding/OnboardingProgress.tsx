import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

// Display positions, not API step IDs: Schedule retains its legacy ID 13.
const STAGES = [
  { title: 'About you', first: 1, last: 5 },
  { title: 'Your training', first: 6, last: 10 },
  { title: 'Make it yours', first: 11, last: 13 },
];

export function OnboardingProgress({ step }: { step: number }) {
  const c = useThemeColors();
  const index = STAGES.findIndex((stage) => step >= stage.first && step <= stage.last);
  if (index < 0) return null;
  const stage = STAGES[index];
  const question = step - stage.first + 1;
  const total = stage.last - stage.first + 1;
  return (
    <View style={styles.wrap} accessible accessibilityRole="progressbar"
      accessibilityLabel={`Stage ${index + 1} of 3: ${stage.title}. Question ${question} of ${total}`}
      accessibilityValue={{ min: 1, max: 13, now: step }}>
      <View style={styles.labels}>
        <Text style={[styles.label, { color: c.text }]}>{stage.title}</Text>
        <Text style={[styles.label, { color: c.mutedText }]}>Stage {index + 1} / 3</Text>
      </View>
      <View style={styles.track}>
        {STAGES.map((item, i) => (
          <View key={item.title} style={[styles.segment, { backgroundColor: c.border }]}>
            <View style={[styles.fill, { backgroundColor: c.accent, width: `${i < index ? 100 : i === index ? question / total * 100 : 0}%` }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16, gap: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  label: { fontFamily: type.weight.semibold, fontSize: type.size.xs, lineHeight: 18 },
  track: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
