import { Ban, UserMinus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { FriendUser } from '@/src/lib/api/friends';
import { radii, spacing, type } from '@/src/styles/tokens';
import { displayName } from '../model';

type MenuChange = 'remove' | 'block';

const CONFIRM: Record<MenuChange, { title: string; text: string; button: string }> = {
  remove: { title: 'Remove friend?', text: 'You’ll stop seeing each other on your friends leaderboards. They aren’t told.', button: 'Remove' },
  block: { title: 'Block?', text: 'You’ll stop being friends, and they won’t be able to find you or send you requests. They aren’t told.', button: 'Block' },
};

/**
 * Remove / block for one friend, confirmed inside the same sheet: opening a
 * second Modal while this one closes is dropped on iOS.
 */
export function FriendMenu({ user, onClose, onPick }: {
  user: FriendUser | null; onClose: () => void; onPick: (change: MenuChange, user: FriendUser) => void;
}) {
  const c = useThemeColors();
  const [confirming, setConfirming] = useState<MenuChange | null>(null);
  useEffect(() => setConfirming(null), [user?.id]);

  const items = [
    { change: 'remove' as const, label: 'Remove friend', Icon: UserMinus, color: c.text },
    { change: 'block' as const, label: 'Block', Icon: Ban, color: c.destructive },
  ];
  return (
    <Sheet visible={!!user} title={user ? displayName(user) : ''} subtitle={user?.name ? `@${user.username}` : undefined} onClose={onClose}>
      {confirming ? (
        <View style={styles.list}>
          <Text style={[styles.confirmTitle, { color: c.text }]}>{CONFIRM[confirming].title}</Text>
          <Text style={[styles.confirmText, { color: c.mutedText }]}>{CONFIRM[confirming].text}</Text>
          <Button testID={`friend-confirm-${confirming}`} title={CONFIRM[confirming].button} variant="danger" onPress={() => user && onPick(confirming, user)} />
          <Button title="Cancel" variant="secondary" onPress={() => setConfirming(null)} />
        </View>
      ) : (
        <View style={styles.list}>
          {items.map(({ change, label, Icon, color }) => (
            <Pressable key={change} testID={`friend-menu-${change}`} accessibilityRole="button" onPress={() => setConfirming(change)}
              style={[styles.item, { backgroundColor: c.card }]}>
              <Icon size={20} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.base, borderRadius: radii.md },
  label: { fontFamily: type.weight.semibold, fontSize: 15 },
  confirmTitle: { fontFamily: type.weight.bold, fontSize: 17 },
  confirmText: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
});
