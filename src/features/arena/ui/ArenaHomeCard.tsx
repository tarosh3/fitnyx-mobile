import { useRouter } from 'expo-router';
import { ArrowRight, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useArenaBoard } from '../data';
import { nextUp, standing } from '../model';

/** Home: this week's Grit among friends, and the gap to the next one up. Hidden until it loads (and on an older backend). */
export function ArenaHomeCard() {
  const c = useThemeColors();
  const router = useRouter();
  const { data } = useArenaBoard('grit', 'friends', 'week');
  if (!data) return null;
  const alone = data.rows.length <= 1;
  const line = alone ? 'Add friends and compete on Grit, Stride and Ride.' : nextUp(data.rows, 'grit') ?? 'Train this week to get on the board.';
  return (
    <Pressable testID="home-arena" onPress={() => router.push((alone ? '/friends?tab=find' : '/arena') as never)}
      accessibilityRole="button" accessibilityLabel={`Arena: ${alone ? line : `${standing(data)}. ${line}`}`}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
      <View style={styles.head}>
        <Trophy size={18} color={c.accent} />
        <Text style={[styles.eyebrow, { color: c.accent }]}>ARENA · THIS WEEK</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: c.text }]}>{alone ? 'Train with friends' : standing(data)}</Text>
          <Text style={[styles.sub, { color: c.mutedText }]}>{line}</Text>
        </View>
        <View style={styles.faces}>
          {data.rows.slice(0, 3).map((r, i) => (
            <Avatar key={r.user.id} uri={r.user.avatar_url || null} name={r.user.name || r.user.username} size={30}
              style={[styles.face, { borderColor: c.card, marginLeft: i ? -10 : 0 }]} />
          ))}
        </View>
        <ArrowRight size={18} color={c.mutedText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.sm },
  pressed: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: 1.2 },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.extrabold, fontSize: 18 },
  sub: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
  faces: { flexDirection: 'row' },
  face: { borderWidth: 2 },
});
