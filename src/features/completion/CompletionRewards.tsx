import { Flame, Info } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';
import { CompletionArtwork } from './CompletionArtwork';

export function CompletionRewards({ screen, seed, xp, streak, eligible = true }: {
  screen: 'workout' | 'roam'; seed?: string; xp: number; streak?: number; eligible?: boolean;
}) {
  const c = useThemeColors();
  return <View style={[styles.band, { backgroundColor: c.accentSoft }]}>
    {/* No medal for a Roam that earned nothing. */}
    <View style={styles.art}>{eligible ? <CompletionArtwork screen={screen} slot="accent" seed={seed} /> : <View style={styles.noMedal}><Info size={24} color={c.mutedText} /></View>}</View>
    <View style={styles.copy}>
      <Text style={[styles.value, { color: c.text }]}>{eligible ? `+${xp.toLocaleString()} XP` : 'Roam recorded'}</Text>
      <Text style={[styles.label, { color: c.mutedText }]}>{eligible ? 'Added to your progress' : 'This one didn’t earn XP'}</Text>
    </View>
    {streak != null ? <View style={[styles.streak, { borderLeftColor: c.border }]}>
      <View style={styles.streakValue}><Flame size={15} color={c.parts.cardio.fg} /><Text style={[styles.streakText, { color: c.text }]}>{streak} {streak === 1 ? 'day' : 'days'}</Text></View>
      <Text style={[styles.label, { color: c.mutedText }]}>Current streak</Text>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  band: { borderRadius: 18, paddingVertical: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  art: { width: 42, height: 48 },
  noMedal: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  value: { fontFamily: type.weight.bold, fontSize: 18, letterSpacing: -0.4 },
  label: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 17 },
  streak: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 12, gap: 5, flexShrink: 1 },
  streakValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
