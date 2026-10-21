import { useRouter } from 'expo-router';
import { ArrowRight, Trophy } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useArenaBoard } from '../data';
import { formatScore, heroRank, isAlone, nextUp } from '../model';

/** Home: the way into the Arena — this week's Grit among friends. Always opens the Arena. Hidden until it loads (and on an older backend). */
export function ArenaHomeCard() {
  const c = useThemeColors();
  const router = useRouter();
  const { data } = useArenaBoard('grit', 'friends', 'week');
  if (!data) return null;
  const alone = isAlone(data);
  const { rank, label, ranked } = heroRank(data);
  const mine = formatScore('grit', data.me.score);
  const title = alone ? 'See where you rank' : ranked ? `${rank} ${label}` : 'No Grit yet this week';
  const line = alone
    ? data.me.score > 0 ? `${mine.value} Grit this week. Compare with friends or the world.` : 'Train this week and compare with friends or the world.'
    : nextUp(data.rows, 'grit') ?? 'Train this week to get on the board.';
  return (
    <Pressable testID="home-arena" onPress={() => router.push('/arena' as never)}
      accessibilityRole="button" accessibilityLabel={`Arena. ${title}. ${line}`}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
      <View style={styles.head}>
        <Trophy size={18} color={c.accent} />
        <Text style={[styles.eyebrow, { color: c.accent }]}>ARENA · THIS WEEK</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.sub, { color: c.mutedText }]}>{line}</Text>
        </View>
        {!alone ? (
          <View style={styles.faces}>
            {data.rows.slice(0, 3).map((r, i) => (
              <Avatar key={r.user.id} uri={r.user.avatar_url || null} name={r.user.name || r.user.username} size={30}
                style={[styles.face, { borderColor: c.card, marginLeft: i ? -10 : 0 }]} />
            ))}
          </View>
        ) : null}
        <ArrowRight size={18} color={c.mutedText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.sm },
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
