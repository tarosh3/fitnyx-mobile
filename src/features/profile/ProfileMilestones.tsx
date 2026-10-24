import { ArrowUpRight, LockKeyhole } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Badge } from '@/src/features/progress/records';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { milestoneArtwork } from './profileArtwork';

export function ProfileMilestones({ badges, onOpen }: { badges: Badge[]; onOpen: () => void }) {
  const c = useThemeColors();
  const earned = badges.filter((badge) => badge.earned);
  const next = badges.find((badge) => !badge.earned);
  // Showcase the most demanding earned milestone in each discipline.
  const featured = earned.length
    ? [...new Map(earned.map((badge) => [milestoneArtwork(badge.id), badge])).values()].slice(-3)
    : badges.slice(0, 3);
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View all milestones, ${earned.length} of ${badges.length} earned`}
        onPress={onOpen} style={({ pressed }) => [styles.heading, { opacity: pressed ? 0.65 : 1 }]}>
        <View style={styles.flex}><Text style={[styles.title, { color: c.text }]}>Milestones</Text><Text style={[styles.subtitle, { color: c.mutedText }]}>{earned.length} of {badges.length} earned</Text></View>
        <View style={styles.open}><Text style={[styles.openText, { color: c.mutedText }]}>View all</Text><ArrowUpRight size={17} color={c.mutedText} /></View>
      </Pressable>
      <View style={styles.shelf}>
        {featured.map((badge) => <Pressable key={badge.id} onPress={onOpen} accessibilityRole="button"
          accessibilityLabel={`${badge.name}. ${badge.earned ? 'Earned. ' : 'Not yet earned. '}${badge.detail}`}
          style={({ pressed }) => [styles.badge, { opacity: pressed ? 0.65 : 1 }]}>
          <View style={styles.emblem}>
            <Image source={milestoneArtwork(badge.id)} resizeMode="contain" accessible={false}
              style={[styles.artwork, { opacity: badge.earned ? 1 : 0.35 }]} />
            <View style={[styles.marker, { backgroundColor: c.card, borderColor: c.border }]}>
              {!badge.earned ? <LockKeyhole size={9} color={c.mutedText} /> : null}
              <Text allowFontScaling={false} style={[styles.mark, { color: badge.earned ? c.text : c.mutedText }]}>{badge.mark}</Text>
            </View>
          </View>
          <Text style={[styles.badgeName, { color: c.text }]}>{badge.name}</Text>
        </Pressable>)}
      </View>
      {next ? <Pressable accessibilityRole="button" accessibilityLabel={`Next milestone: ${next.name}. ${next.detail}`} onPress={onOpen}
        style={({ pressed }) => [styles.next, { borderColor: c.border, opacity: pressed ? 0.65 : 1 }]}>
        <View style={styles.nextHeading}><Text style={[styles.eyebrow, { color: c.mutedText }]}>UP NEXT</Text><Text style={[styles.nextName, { color: c.text }]}>{next.name}</Text></View>
        <View style={[styles.track, { backgroundColor: c.border }]}><View style={[styles.fill, { width: `${Math.max(0, Math.min(1, next.progress)) * 100}%`, backgroundColor: c.accent }]} /></View>
        <Text style={[styles.subtitle, { color: c.mutedText }]}>{next.detail}</Text>
      </Pressable> : <Text style={[styles.complete, { color: c.accent }]}>Every milestone earned. What a journey.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base },
  flex: { flex: 1, minWidth: 0 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  title: { fontFamily: type.weight.bold, fontSize: 17, letterSpacing: -0.3 },
  subtitle: { fontFamily: type.weight.regular, fontSize: 11, lineHeight: 17, marginTop: 3 },
  open: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  openText: { fontFamily: type.weight.medium, fontSize: 11 },
  shelf: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.base, paddingBottom: spacing.base },
  badge: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.sm },
  emblem: { width: 72, height: 74, alignItems: 'center', justifyContent: 'center' },
  artwork: { width: 72, height: 72 },
  marker: { position: 'absolute', bottom: 0, minWidth: 29, height: 18, paddingHorizontal: 6, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  mark: { fontFamily: type.weight.bold, fontSize: 9, letterSpacing: 0.3 },
  badgeName: { fontFamily: type.weight.semibold, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  next: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm, minHeight: 64 },
  nextHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 9, letterSpacing: 1.2 },
  nextName: { fontFamily: type.weight.semibold, fontSize: 12 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  complete: { fontFamily: type.weight.medium, fontSize: 12, textAlign: 'center', paddingBottom: spacing.sm },
});
