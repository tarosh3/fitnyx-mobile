import { ArrowUpRight, Pencil } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

export interface LevelInfo { level: number; xp: number; nextLevelXp: number; progress: number }

/** Identity leads; level progress stays a compact, secondary part of the profile. */
export function ProfileHero({ name, username, bio, avatarUrl, level, loading, onEdit }: {
  name: string; username?: string | null; bio?: string | null; avatarUrl?: string | null;
  level?: LevelInfo; loading: boolean; onEdit: () => void;
}) {
  const c = useThemeColors();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.3;
  const progress = level ? Math.max(0, Math.min(100, level.progress)) : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.identity}>
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile photo"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Avatar uri={avatarUrl} name={name} size={compact ? 68 : 80} bg={c.surface} fg={c.text}
            style={{ borderRadius: radii['2xl'], borderWidth: 1, borderColor: c.border }} />
          <View pointerEvents="none" style={[styles.photoEdit, { backgroundColor: c.text, borderColor: c.background }]}>
            <Pencil size={11} color={c.background} strokeWidth={2} />
          </View>
        </Pressable>
        <View style={styles.nameBlock}>
          <Text accessibilityRole="header" style={[styles.name, { color: c.text }, compact && { fontSize: 24, lineHeight: 29 }]}>{name}</Text>
          {username ? <Text style={[styles.handle, { color: c.mutedText }]} numberOfLines={2}>@{username}</Text> : null}
        </View>
      </View>
      {bio ? <Text style={[styles.bio, { color: c.mutedText }]}>{bio}</Text> : null}
      <View style={styles.levelRow}>
        <View style={styles.levelCopy}>
          {level ? <>
            <Text style={[styles.levelTitle, { color: c.text }]}>Level {level.level}<Text style={[styles.levelXP, { color: c.mutedText }]}>  ·  {level.xp.toLocaleString()} XP</Text></Text>
            <View accessible accessibilityRole="progressbar" accessibilityLabel={`Progress to level ${level.level + 1}`}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }} style={[styles.track, { backgroundColor: c.border }]}>
              <View style={[styles.fill, { width: `${progress}%`, backgroundColor: c.accent }]} />
            </View>
            <Text style={[styles.levelHint, { color: c.mutedText }]}>{Math.max(0, level.nextLevelXp - level.xp).toLocaleString()} XP to level {level.level + 1}</Text>
          </> : <View style={styles.loading}>
            {loading ? <ActivityIndicator size="small" color={c.accent} /> : null}
            <Text style={[styles.levelHint, { color: c.mutedText }]}>{loading ? 'Loading progress…' : 'Progress unavailable'}</Text>
          </View>}
        </View>
        <Pressable testID="edit-profile" accessibilityRole="button" accessibilityLabel="Edit profile" onPress={onEdit}
          style={({ pressed }) => [styles.edit, { backgroundColor: pressed ? c.border : c.card, borderColor: c.border }]}>
          <Text style={[styles.editText, { color: c.text }]}>Edit profile</Text><ArrowUpRight size={15} color={c.mutedText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.base },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  nameBlock: { flex: 1, minWidth: 0, gap: spacing.xs },
  name: { fontFamily: type.weight.extrabold, fontSize: 28, lineHeight: 33, letterSpacing: -0.9 },
  handle: { fontFamily: type.weight.medium, fontSize: 13, lineHeight: 19 },
  photoEdit: { position: 'absolute', right: -3, bottom: -3, width: 26, height: 26, borderRadius: 13, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  bio: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21 },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.base },
  levelCopy: { flex: 1, minWidth: 135, gap: 7 },
  levelTitle: { fontFamily: type.weight.bold, fontSize: 12, lineHeight: 17 },
  levelXP: { fontFamily: type.weight.medium },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  levelHint: { fontFamily: type.weight.regular, fontSize: 11, lineHeight: 16 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  edit: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  editText: { fontFamily: type.weight.semibold, fontSize: 12 },
});
