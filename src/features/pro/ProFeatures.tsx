import { Camera, FileText, Ghost, HeartPulse, MessageCircle, Palette, TrendingUp, UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

type Icon = typeof Camera;

/** What Pro adds, in the order people care about. Free limits are said plainly. */
export const PRO_FEATURES: { icon: Icon; title: string; detail: string }[] = [
  { icon: MessageCircle, title: 'Unlimited Filo', detail: 'Free: 5 messages a day' },
  { icon: Camera, title: 'Log a meal from a photo', detail: 'Snap your plate, check the foods, add it' },
  { icon: TrendingUp, title: 'Adaptive program', detail: 'Targets for every workout and a weekly check-in' },
  { icon: Ghost, title: 'Race your past self', detail: 'A ghost of a past Roam runs beside you' },
  { icon: FileText, title: 'Weekly AI report', detail: 'What your training says, in plain words' },
  { icon: UtensilsCrossed, title: 'AI diet plan', detail: 'Meals built to hit your calories and protein' },
  { icon: HeartPulse, title: 'All 15 guided cardio programs', detail: 'Free: 3 programs' },
  { icon: Palette, title: 'Extra share-card designs', detail: 'New looks for your workout and Roam cards' },
];

export function ProFeatures() {
  const c = useThemeColors();
  return (
    <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]} testID="pro-features">
      {PRO_FEATURES.map(({ icon: I, title, detail }, i) => (
        <View key={title} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
          <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
            <I size={18} color={c.accent} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: c.text }]}>{title}</Text>
            <Text style={[styles.detail, { color: c.mutedText }]}>{detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radii.xl, borderWidth: 1, paddingHorizontal: spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  icon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.semibold, fontSize: 15 },
  detail: { fontFamily: type.weight.regular, fontSize: 13 },
});
