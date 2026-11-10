import { Camera, Check, FileText, Ghost, HeartPulse, MessageCircle, Palette, TrendingUp, UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

type Icon = typeof Camera;

export const PRO_FEATURES: { icon: Icon; title: string; detail: string; proDetail?: string }[] = [
  { icon: MessageCircle, title: 'Unlimited Filo', detail: 'Free: 5 messages a day', proDetail: 'Chat as much as you like' },
  { icon: Camera, title: 'Log a meal from a photo', detail: 'Snap your plate, check the foods, add it' },
  { icon: TrendingUp, title: 'Adaptive program', detail: 'Targets for every workout and a weekly check-in' },
  { icon: Ghost, title: 'Race your past self', detail: 'A ghost of a past Roam runs beside you' },
  { icon: FileText, title: 'Weekly AI report', detail: 'What your training says, in plain words' },
  { icon: UtensilsCrossed, title: 'AI diet plan', detail: 'Meals built to hit your calories and protein' },
  { icon: HeartPulse, title: 'All 15 guided cardio programs', detail: 'Free: 3 programs', proDetail: 'Every goal, from warm-ups to hills' },
  { icon: Palette, title: 'Extra share-card designs', detail: 'New looks for your workout and Roam cards' },
];

/** Lead with outcomes; the full entitlement list remains easy to scan. */
export function ProFeatures({ pro = false }: { pro?: boolean }) {
  const c = useThemeColors();
  return (
    <View testID="pro-features" style={styles.section}>
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: c.accent }]}>{pro ? 'YOUR PRO ADVANTAGE' : 'THE PRO ADVANTAGE'}</Text>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: c.text }]}>{'Less guesswork.\nMore progress.'}</Text>
      </View>

      <View style={[styles.coach, { backgroundColor: c.accentSoft }]}>
        <View style={styles.coachCopy}>
          <Text style={[styles.eyebrow, { color: c.accent }]}>01 / YOUR AI COACH</Text>
          <Text style={[styles.featureTitle, { color: c.text }]}>Unlimited Filo</Text>
          <Text style={[styles.body, { color: c.mutedText }]}>Talk through your training, meals, and next move. As often as you need.</Text>
          <Text style={[styles.coachFoot, { color: c.accent }]}>{pro ? 'Unlimited conversations, unlocked' : 'Go beyond 5 free messages a day'}</Text>
        </View>
        <Image source={require('../../../assets/images/illustrations/filo.png')} style={styles.filo} resizeMode="contain" accessible={false} />
      </View>

      <View style={[styles.training, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.trainingHead}>
          <Text style={[styles.eyebrow, { color: c.accent }]}>02 / TRAIN WITH DIRECTION</Text>
          <TrendingUp size={22} color={c.accent} />
        </View>
        <Text style={[styles.featureTitle, { color: c.text }]}>A plan that moves with you.</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>Workout targets that adapt, with a weekly check-in to keep you moving forward.</Text>
        <View style={[styles.rhythm, { borderColor: c.border }]}>
          {['TRAIN', 'CHECK IN', 'ADAPT'].map((label, i) => (
            <View key={label} style={styles.step}>
              <Text style={[styles.stepNumber, { color: c.accent }]}>0{i + 1}</Text>
              <Text style={[styles.stepLabel, { color: c.text }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.nutrition, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.nutritionCopy}>
          <Text style={[styles.eyebrow, { color: c.accent }]}>03 / FUEL YOUR GOALS</Text>
          <Text style={[styles.featureTitle, { color: c.text }]}>{'Snap. Log.\nGet on with it.'}</Text>
          <Text style={[styles.body, { color: c.mutedText }]}>Meal photos and an AI diet plan built around your targets.</Text>
        </View>
        <Image source={require('../../../assets/images/nutrition/fuel-bowl.png')} style={styles.bowl} resizeMode="contain" accessible={false} />
      </View>

      <View style={styles.included}>
        <Text style={[styles.includedTitle, { color: c.text }]}>{pro ? 'All yours. All included.' : 'One membership. All of this.'}</Text>
        {PRO_FEATURES.slice(3).filter(({ title }) => title !== 'AI diet plan').map(({ title, detail, proDetail }) => (
          <View key={title} style={[styles.row, { borderColor: c.border }]}>
            <Check size={17} color={c.accent} />
            <View style={styles.rowText}>
              <Text style={[styles.listTitle, { color: c.text }]}>{title}</Text>
              <Text style={[styles.detail, { color: c.mutedText }]}>{pro && proDetail ? proDetail : detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { gap: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1.2, lineHeight: 16 },
  sectionTitle: { fontFamily: type.weight.extrabold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8 },
  coach: { borderRadius: radii.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  coachCopy: { flex: 1, gap: spacing.sm, zIndex: 1 },
  featureTitle: { fontFamily: type.weight.bold, fontSize: 21, lineHeight: 27, letterSpacing: -0.5 },
  body: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 20 },
  coachFoot: { fontFamily: type.weight.semibold, fontSize: 11, lineHeight: 17, marginTop: spacing.xs },
  filo: { width: 88, height: 118, marginRight: -spacing.sm, marginLeft: spacing.xs },
  training: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  trainingHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rhythm: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.base, marginTop: spacing.sm, gap: spacing.sm },
  step: { flex: 1, gap: spacing.xs },
  // Inter, not Anton: Anton on in-app numbers read as squashed (CLAUDE.md, Fonts).
  stepNumber: { fontFamily: type.weight.extrabold, fontSize: 22, fontVariant: ['tabular-nums'] },
  stepLabel: { fontFamily: type.weight.semibold, fontSize: 10, letterSpacing: 0.8 },
  nutrition: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  nutritionCopy: { flex: 1, gap: spacing.sm },
  bowl: { width: 112, height: 140, marginRight: -spacing.lg, marginLeft: spacing.xs },
  included: { marginTop: spacing.md },
  includedTitle: { fontFamily: type.weight.bold, fontSize: 17, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: spacing.xs },
  listTitle: { fontFamily: type.weight.semibold, fontSize: 14, lineHeight: 19 },
  detail: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 18 },
});
