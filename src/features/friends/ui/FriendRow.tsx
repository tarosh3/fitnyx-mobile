import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { FriendUser } from '@/src/lib/api/friends';
import { radii, spacing, type } from '@/src/styles/tokens';
import { displayName } from '../model';

/** Avatar, name and @handle, with actions on the right. */
export function FriendRow({ user, children }: { user: FriendUser; children?: React.ReactNode }) {
  const c = useThemeColors();
  const title = displayName(user);
  return (
    <View style={styles.row}>
      <Avatar uri={user.avatar_url || null} name={user.name || user.username} size={44} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
        {user.name ? <Text style={[styles.handle, { color: c.mutedText }]} numberOfLines={1}>@{user.username}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A compact row button; primary = filled green. Shows a spinner while busy. */
export function RowButton({ label, onPress, primary, busy, testID }: {
  label: string; onPress?: () => void; primary?: boolean; busy?: boolean; testID?: string;
}) {
  const c = useThemeColors();
  const fg = primary ? c.primaryText : c.text;
  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress || busy} accessibilityRole="button" accessibilityLabel={label}
      hitSlop={6} style={[styles.button, primary ? { backgroundColor: c.primary } : { backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }]}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.semibold, fontSize: 15 },
  handle: { fontFamily: type.weight.regular, fontSize: 13 },
  button: { minWidth: 84, height: 34, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: type.weight.bold, fontSize: 13 },
});
