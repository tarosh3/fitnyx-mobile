import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Empty } from '@/src/features/progress/ui/bits';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';
import { applyFriendChange, useBlockedUsers } from '../data';
import { FriendRow, RowButton } from './FriendRow';

/** Accounts the user blocked, with Unblock. Feedback stays in the sheet (toasts render under it). */
export function BlockedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useThemeColors();
  const { users, error, reload } = useBlockedUsers(visible);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const unblock = async (id: string) => {
    setBusy(id);
    try {
      await applyFriendChange('unblock', id);
      setFailed(null);
      await reload();
    } catch (e) {
      setFailed((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet visible={visible} title="Blocked accounts" subtitle="They can’t find you or send you requests." onClose={onClose}>
      {failed || error ? <Text style={[styles.error, { color: c.destructive }]}>{failed ?? error}</Text> : null}
      {users == null ? (error ? null : <ActivityIndicator color={c.accent} style={styles.spinner} />) : users.length ? (
        <View>
          {users.map((u) => (
            <FriendRow key={u.id} user={u}>
              <RowButton label="Unblock" busy={busy === u.id} onPress={() => unblock(u.id)} />
            </FriendRow>
          ))}
        </View>
      ) : <Empty text="You haven’t blocked anyone." />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: type.weight.semibold, fontSize: 13, marginBottom: spacing.sm },
  spinner: { marginVertical: spacing.xl },
});
