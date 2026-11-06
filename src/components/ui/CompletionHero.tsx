import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CompletionArtwork } from '@/src/features/completion/CompletionArtwork';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** The result is the focal point. Art occupies a bounded, separate supporting column. */
export function CompletionHero({ variant, eyebrow, done = true, title, subtitle, metric, children, onLongPress, seed }: {
  variant: 'workout' | 'roam'; eyebrow: string;
  /** Just finished: a check beside the eyebrow. Off when reopening something from a while ago. */
  done?: boolean;
  title: React.ReactNode; subtitle?: string;
  metric: { value: string; unit?: string; label: string };
  children?: React.ReactNode; onLongPress?: () => void; seed?: string;
}) {
  const c = useThemeColors();
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.hero}>
      <View style={styles.status}>
        {done ? <View style={[styles.check, { backgroundColor: c.accent }]}><Check size={11} strokeWidth={3} color={c.background} /></View> : null}
        <Text style={[styles.eyebrow, { color: c.accent }]} onLongPress={onLongPress} suppressHighlighting>{eyebrow}</Text>
      </View>
      {typeof title === 'string' ? <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">{title}</Text> : title}
      {subtitle ? <Text style={[styles.subtitle, { color: c.mutedText }]}>{subtitle}</Text> : null}
      <View style={styles.result}>
        <View style={styles.metric} accessible accessibilityLabel={`${metric.label}: ${metric.value} ${metric.unit ?? ''}`}>
          <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {metric.value}{metric.unit ? <Text style={[styles.unit, { color: c.mutedText }]}> {metric.unit}</Text> : null}
          </Text>
          <Text style={[styles.metricLabel, { color: c.mutedText }]}>{metric.label}</Text>
        </View>
        <View style={[styles.art, fontScale > 1.3 && styles.smallArt]}><CompletionArtwork screen={variant} seed={seed} /></View>
      </View>
      {children ? <View style={[styles.footer, { borderColor: c.border }]}>{children}</View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  hero: { paddingHorizontal: 4 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  check: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', flexShrink: 1 },
  title: { fontFamily: type.weight.bold, fontSize: 27, lineHeight: 34, letterSpacing: -0.9 },
  subtitle: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20, marginTop: 5 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 16 },
  metric: { flex: 1, minWidth: 0 },
  value: { fontFamily: type.display.fontFamily, fontSize: 68, letterSpacing: -1, lineHeight: 82, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.weight.medium, fontSize: 22, letterSpacing: -0.4 },
  metricLabel: { fontFamily: type.weight.medium, fontSize: 14, marginTop: 3 },
  art: { width: '38%', maxWidth: 148, aspectRatio: 1 },
  smallArt: { width: '27%' },
  footer: { paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
});
