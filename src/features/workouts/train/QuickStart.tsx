import { ArrowUpRight, HeartPulse, Plus } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionHead } from '@/src/features/workouts/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

export function QuickStart({ onEmpty, onCardio }: { onEmpty: () => void; onCardio: () => void }) {
  const c = useThemeColors();
  const choices = [
    { label: 'Build a workout', sub: 'Start with a blank slate', tone: c.parts.core, Icon: Plus, source: require('../../../../assets/images/workouts/strength-equipment.png'), onPress: onEmpty, id: 'quick-empty' },
    { label: 'Cardio', sub: 'Treadmill, bike & more', tone: c.parts.cardio, Icon: HeartPulse, source: require('../../../../assets/images/workouts/cardio-shoe.png'), onPress: onCardio, id: 'quick-cardio' },
  ];
  return (
    <View style={styles.section}>
      <SectionHead title="Find your flow" />
      <View style={styles.tiles}>
        {choices.map(({ label, sub, tone, Icon, source, onPress, id }) => (
          <Pressable key={id} testID={id} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${sub}`}
            style={({ pressed }) => [styles.tile, { backgroundColor: tone.bg, borderColor: c.border }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}>
            <View style={styles.art} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.orbit, { borderColor: tone.fg }]} />
              <Image source={source} style={styles.equipment} resizeMode="contain" />
              <View style={[styles.arrow, { backgroundColor: c.card }]}><ArrowUpRight size={15} color={tone.fg} /></View>
            </View>
            <View style={styles.copy}>
              <View style={styles.label}><Icon size={14} color={tone.fg} /><Text style={[styles.kind, { color: tone.fg }]}>{id === 'quick-empty' ? 'Freestyle' : 'Conditioning'}</Text></View>
              <Text style={[styles.name, { color: c.text }]}>{label}</Text>
              <Text style={[styles.meta, { color: c.mutedText }]}>{sub}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: 28 },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, minWidth: 0, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  art: { height: 108, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: StyleSheet.hairlineWidth, opacity: 0.25 },
  equipment: { width: '96%', height: 116, transform: [{ rotate: '-8deg' }] },
  arrow: { position: 'absolute', right: 12, top: 12, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { paddingHorizontal: 14, paddingBottom: 16, gap: 5 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kind: { flexShrink: 1, fontFamily: type.weight.bold, fontSize: 9, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  name: { fontFamily: type.weight.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.35 },
  meta: { fontFamily: type.weight.regular, fontSize: 12, lineHeight: 17 },
});
