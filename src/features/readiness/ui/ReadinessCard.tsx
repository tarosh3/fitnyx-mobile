import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { BAND_LABEL } from '../readiness';
import { useReadiness } from '../useReadiness';
import { ReadinessRing, bandColor } from './ReadinessRing';

/**
 * Home: the daily readiness score. Hidden entirely for users whose health store
 * has no readiness data (phone-only / sync off), so it never nags them.
 */
export function ReadinessCard() {
  const c = useThemeColors();
  const router = useRouter();
  const { readiness, series } = useReadiness();
  if (!series.length) return null;

  const color = bandColor(c, readiness.band);
  const label = readiness.score != null ? BAND_LABEL[readiness.band] : readiness.baselineDays ? 'Building' : 'No data';

  return (
    <Pressable
      testID="home-readiness"
      onPress={() => router.push('/readiness' as never)}
      accessibilityRole="button"
      accessibilityLabel={`Readiness ${readiness.score ?? 'not ready yet'}. ${readiness.reason}`}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card }, pressed && styles.pressed]}
    >
      <ReadinessRing score={readiness.score} color={color} track={c.progress.empty} size={64} stroke={6}>
        <Text style={[styles.score, { color: readiness.score != null ? c.text : c.mutedText }]}>
          {readiness.score ?? '—'}
        </Text>
      </ReadinessRing>
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color }]}>READINESS · {label.toUpperCase()}</Text>
        <Text style={[styles.reason, { color: c.text }]} numberOfLines={2}>{readiness.reason}</Text>
      </View>
      <ArrowRight size={18} color={c.mutedText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, borderRadius: radii['2xl'], padding: spacing.base },
  pressed: { opacity: 0.85 },
  score: { fontFamily: type.weight.extrabold, fontSize: 20, fontVariant: ['tabular-nums'] },
  content: { flex: 1, gap: 3 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1.2 },
  reason: { fontFamily: type.weight.semibold, fontSize: 15, lineHeight: 20 },
});
