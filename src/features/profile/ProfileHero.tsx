import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/src/components/ui/Avatar';
import { Card } from '@/src/components/ui/Card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

const SIZE = 124;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export interface LevelInfo { level: number; xp: number; nextLevelXp: number; progress: number }

/** Photo (or initials) inside an XP ring, name, bio and the level bar. */
export function ProfileHero({ name, bio, avatarUrl, level }: { name: string; bio?: string | null; avatarUrl?: string | null; level: LevelInfo }) {
  const c = useThemeColors();
  const pct = Math.max(0, Math.min(1, level.progress / 100));
  const toNext = Math.max(0, level.nextLevelXp - level.xp);
  return (
    <View style={styles.wrap}>
      <View style={styles.ringWrap} accessible accessibilityLabel={`${name}, level ${level.level}`}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.border} strokeWidth={STROKE} fill="none" />
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.primary} strokeWidth={STROKE} fill="none" strokeLinecap="round"
            strokeDasharray={`${CIRC * pct} ${CIRC}`} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
        </Svg>
        <Avatar uri={avatarUrl} name={name} size={SIZE - 24} />
        <View style={[styles.level, { backgroundColor: c.primary, borderColor: c.background }]}>
          <Text style={[styles.levelText, { color: c.primaryText }]}>LV {level.level}</Text>
        </View>
      </View>
      <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{name}</Text>
      {bio ? <Text style={[styles.bio, { color: c.mutedText }]} numberOfLines={3}>{bio}</Text> : null}

      <Card style={styles.xp}>
        <View style={styles.xpRow}>
          <Text style={[styles.xpTitle, { color: c.text }]}>Level {level.level}</Text>
          <Text style={[styles.xpNums, { color: c.mutedText }]}>{level.xp.toLocaleString('en-US')} / {level.nextLevelXp.toLocaleString('en-US')} XP</Text>
        </View>
        <View style={[styles.bar, { backgroundColor: c.progress.empty }]}>
          <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: c.primary }} />
        </View>
        <Text style={[styles.xpHint, { color: c.mutedText }]}>{toNext.toLocaleString('en-US')} XP to Level {level.level + 1} · every workout and Roam earns XP</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  ringWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  level: { position: 'absolute', bottom: -10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.md, borderWidth: 3 },
  levelText: { fontFamily: type.weight.extrabold, fontSize: 11, letterSpacing: 0.8 },
  name: { fontFamily: type.weight.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: spacing.sm },
  bio: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  xp: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  xpTitle: { fontFamily: type.weight.bold, fontSize: 14 },
  xpNums: { fontFamily: type.weight.semibold, fontSize: 12 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpHint: { fontFamily: type.weight.regular, fontSize: 12 },
});
