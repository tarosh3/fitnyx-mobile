import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { BAND_LABEL } from '../readiness';
import { useConnectHealth } from '../useConnectHealth';
import { useReadiness } from '../useReadiness';
import { ConnectHealthCard } from './ConnectHealthCard';
import { ReadinessRing, bandColor } from './ReadinessRing';

/**
 * Home: the daily readiness score. Without readiness data it is hidden, except
 * for a closable "connect" hint while health sync is off.
 */
export function ReadinessCard() {
  const c = useThemeColors();
  const router = useRouter();
  const { readiness, series, refresh } = useReadiness();
  const hint = useConnectHealth();
  if (!series.length) {
    // Connecting re-reads the store at once: the cached empty series would hide the card for a day.
    return hint.show ? <ConnectHealthCard label={hint.label} onDismiss={hint.dismiss}
      onConnect={async () => { if (await hint.connect()) await refresh(); }} /> : null;
  }

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
