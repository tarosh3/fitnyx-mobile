import { Camera, Check, ChevronDown, ChevronUp, FileText, Ghost, HeartPulse, MessageCircle, Palette, TrendingUp, UtensilsCrossed } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { motion, radii, spacing, type } from '@/src/styles/tokens';

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

const STORIES = [
  { tab: 'Coach', label: '01 / IN YOUR CORNER', title: 'Unlimited Filo', body: 'Talk through your training, meals, and next move. As often as you need.', note: 'From 5 free messages a day to unlimited.', features: [0, 4] },
  { tab: 'Train', label: '02 / BUILT AROUND YOU', title: 'Find your next gear.', body: 'Workout targets that adapt, a weekly check-in, and a past Roam to race against.', note: 'Train. Check in. Adapt. Go again.', features: [2, 3, 6] },
  { tab: 'Fuel', label: '03 / LESS FRICTION, MORE FUEL', title: 'A photo. A plan.\nA little less effort.', body: 'Log meals from a photo and build an AI diet plan around your calorie and protein targets.', note: 'Review the foods before adding your meal.', features: [1, 5] },
];

/** Three focused stories, then a complete comparison. All claims mirror existing entitlements. */
export function ProFeatures({ pro = false }: { pro?: boolean }) {
  const c = useThemeColors();
  const [selected, setSelected] = useState(0);
  const [compare, setCompare] = useState(false);
  const reduce = useReducedMotion();
  const opacity = useSharedValue(1);
  const reveal = useAnimatedStyle(() => ({ opacity: opacity.value }));
  useEffect(() => {
    if (reduce) { opacity.value = 1; return; }
    opacity.value = 0.45;
    opacity.value = withTiming(1, { duration: motion.duration.base });
  }, [selected, reduce, opacity]);
  const story = STORIES[selected];
  return (
    <View testID="pro-features" style={styles.section}>
      <Text style={[styles.eyebrow, { color: c.accent }]}>{pro ? 'YOUR PRO ADVANTAGE' : 'MEET YOUR PRO ADVANTAGE'}</Text>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: c.text }]}>{'More support.\nEvery step of the way.'}</Text>
      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: c.card, borderColor: c.border }]}>
        {STORIES.map(({ tab }, i) => <Pressable key={tab} testID={`pro-tab-${tab.toLowerCase()}`} accessibilityRole="tab" accessibilityState={{ selected: selected === i }} accessibilityLabel={`${tab} benefits`}
          onPress={() => { setSelected(i); void Haptics.selectionAsync().catch(() => undefined); }}
          style={({ pressed }) => [styles.tab, selected === i && { backgroundColor: c.primary }, pressed && { opacity: 0.75 }]}>
          <Text style={[styles.tabLabel, { color: selected === i ? c.primaryText : c.mutedText }]}>{tab}</Text>
        </Pressable>)}
      </View>
      <Animated.View style={[styles.story, { backgroundColor: c.accentSoft }, reveal]}>
        <View style={styles.art} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {selected === 0 ? <>
            <View style={[styles.chat, { backgroundColor: c.card, borderColor: c.border }]}><Text style={[styles.chatText, { color: c.text }]}>{'A little guidance.\nWhenever you need it.'}</Text><View style={styles.dots}>{[0,1,2].map(i => <View key={i} style={[styles.dot, { backgroundColor: c.accent }]} />)}</View></View>
            <Image source={require('../../../assets/images/illustrations/filo.png')} style={styles.filo} resizeMode="contain" accessible={false} />
          </> : selected === 1 ? <Svg width="100%" height="100%" viewBox="0 0 320 160" accessible={false}>
            {[42,82,122].map(y => <Path key={y} d={`M20 ${y}H300`} stroke={c.accent} opacity={0.15} />)}
            <Path d="M20 132C55 135 54 102 90 108S120 61 157 78S204 30 232 48S270 21 300 20" fill="none" stroke={c.accent} strokeWidth="4" strokeLinecap="round" />
            <Path d="M20 143C70 131 90 137 123 108S177 112 209 87S260 91 300 64" fill="none" stroke={c.accent} strokeWidth="2" strokeDasharray="5 7" opacity={0.5} />
            <Circle cx="232" cy="48" r="8" fill={c.primary} stroke={c.card} strokeWidth="3" />
            <Circle cx="300" cy="20" r="5" fill={c.accent} />
          </Svg> : <Image source={require('../../../assets/images/nutrition/fuel-bowl.png')} style={styles.bowl} resizeMode="contain" accessible={false} />}
        </View>
        <Text style={[styles.eyebrow, { color: c.accent }]}>{story.label}</Text>
        <Text accessibilityRole="header" style={[styles.featureTitle, { color: c.text }]}>{story.title}</Text>
        <Text style={[styles.body, { color: c.mutedText }]}>{story.body}</Text>
        <View style={[styles.noteWrap, { borderColor: c.accent }]}><Text style={[styles.note, { color: c.accent }]}>{pro && selected === 0 ? 'Unlimited conversations, included in your Pro.' : story.note}</Text></View>
      </Animated.View>
      <View accessibilityLiveRegion="polite">
        {story.features.map(index => {
          const { icon: Icon, title, detail, proDetail } = PRO_FEATURES[index];
          return <View key={title} style={[styles.featureRow, { borderColor: c.border }]}>
            <Icon size={20} color={c.accent} /><View style={styles.rowCopy}><Text style={[styles.listTitle, { color: c.text }]}>{index === 0 ? 'Room for every question' : title}</Text><Text style={[styles.detail, { color: c.mutedText }]}>{pro && proDetail ? proDetail : detail}</Text></View><Check size={16} color={c.accent} />
          </View>;
        })}
      </View>
      <View style={[styles.extra, { backgroundColor: c.card }]}><Palette size={20} color={c.accent} /><Text style={[styles.detail, { color: c.mutedText }]}>Plus extra share-card designs for your workouts and Roams.</Text></View>
      <Pressable testID="pro-compare-toggle" accessibilityRole="button" accessibilityState={{ expanded: compare }} onPress={() => setCompare(!compare)}
        style={({ pressed }) => [styles.compareToggle, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
        <Text style={[styles.listTitle, { color: c.text }]}>Compare Free & Pro</Text>{compare ? <ChevronUp size={20} color={c.accent} /> : <ChevronDown size={20} color={c.accent} />}
      </Pressable>
      {compare ? <View testID="pro-comparison" style={[styles.comparison, { borderColor: c.border }]}>
        <View style={styles.compareRow}><Text style={[styles.compareName, { color: c.mutedText }]}>Your membership</Text><Text style={[styles.compareValue, { color: c.mutedText }]}>FREE</Text><Text style={[styles.compareValue, { color: c.accent }]}>PRO</Text></View>
        {[
          ['Filo messages', '5 / day', 'Unlimited'], ['Guided cardio', '3 programs', 'All 15'], ['Meal photos', '—', 'Included'], ['Adaptive program', '—', 'Included'], ['Race your past self', '—', 'Included'], ['Weekly AI report¹', '—', 'Included'], ['AI diet plan', '—', 'Included'], ['Extra share designs', '—', 'Included'],
        ].map(([label, free, paid]) => <View accessible accessibilityLabel={`${label}. Free: ${free === '—' ? 'not included' : free}. Pro: ${paid}.`} key={label} style={[styles.compareRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}>
          <Text style={[styles.compareName, { color: c.text }]}>{label}</Text><Text style={[styles.compareValue, { color: c.mutedText }]}>{free}</Text><Text style={[styles.compareValue, { color: c.accent }]}>{paid}</Text>
        </View>)}
        <Text style={[styles.fine, { color: c.mutedText }]}>¹ Generate one report every 7 days after 10 training days. Reading saved reports stays free.</Text>
      </View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.md },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1.4, lineHeight: 16 },
  sectionTitle: { fontFamily: type.weight.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -1, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', borderRadius: radii.pill, padding: 5, borderWidth: 1, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  tabLabel: { fontFamily: type.weight.bold, fontSize: 14 },
  story: { padding: spacing.xl, borderRadius: radii['2xl'], gap: spacing.sm },
  art: { height: 158, marginBottom: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chat: { flex: 1, borderWidth: 1, borderRadius: radii.lg, padding: spacing.base, marginRight: -12, gap: spacing.base, transform: [{ rotate: '-4deg' }] },
  chatText: { fontFamily: type.weight.semibold, fontSize: 13, lineHeight: 19 },
  dots: { flexDirection: 'row', gap: 4 }, dot: { width: 5, height: 5, borderRadius: radii.pill },
  filo: { width: 114, height: 153 },
  bowl: { width: '100%', height: 170 },
  featureTitle: { fontFamily: type.weight.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.8 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 22 },
  noteWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, marginTop: spacing.sm },
  note: { fontFamily: type.weight.semibold, fontSize: 11, lineHeight: 18 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth },
  rowCopy: { flex: 1, gap: spacing.xs },
  listTitle: { fontFamily: type.weight.bold, fontSize: 14, lineHeight: 21 },
  detail: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: radii.lg },
  compareToggle: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1 },
  comparison: { borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md },
  compareRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.md },
  compareName: { flex: 1.5, fontFamily: type.weight.medium, fontSize: 11, lineHeight: 17 },
  compareValue: { flex: 1, fontFamily: type.weight.semibold, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  fine: { fontFamily: type.weight.regular, fontSize: 11, lineHeight: 18, paddingVertical: spacing.base },
});
