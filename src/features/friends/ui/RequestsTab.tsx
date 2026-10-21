import React, { useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { Empty } from '@/src/features/progress/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { FriendUser } from '@/src/lib/api/friends';
import { spacing, type } from '@/src/styles/tokens';
import type { FriendChange } from '../model';
import { FriendRow, RowButton } from './FriendRow';

/** Requests waiting for the user (Accept / Decline) and the ones they sent (Cancel). */
export function RequestsTab({ incoming, outgoing, onChange, onRefresh }: {
  incoming: FriendUser[]; outgoing: FriendUser[];
  onChange: (change: FriendChange, user: FriendUser) => Promise<unknown>;
  onRefresh: () => Promise<void>;
}) {
  const c = useThemeColors();
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const press = async (change: FriendChange, user: FriendUser) => {
    setBusy(`${change}:${user.id}`);
    await onChange(change, user);
    setBusy(null);
  };
  const refresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const sections = [
    { key: 'incoming', title: 'Friend requests', data: incoming },
    ...(outgoing.length ? [{ key: 'outgoing', title: 'Sent', data: outgoing }] : []),
  ];

  return (
    <SectionList
      sections={sections}
      keyExtractor={(u) => u.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
      renderSectionHeader={({ section }) => <Text style={[styles.header, { color: c.mutedText }]}>{section.title}</Text>}
      renderSectionFooter={({ section }) => (section.key === 'incoming' && !incoming.length ? <Empty text="No requests right now." /> : null)}
      renderItem={({ item, section }) => (
        <FriendRow user={item}>
          {section.key === 'incoming' ? (
            <View style={styles.actions}>
              <RowButton testID={`accept-${item.username}`} label="Accept" primary busy={busy === `accept:${item.id}`} onPress={() => press('accept', item)} />
              <RowButton testID={`decline-${item.username}`} label="Decline" busy={busy === `decline:${item.id}`} onPress={() => press('decline', item)} />
            </View>
          ) : (
            <RowButton label="Cancel" busy={busy === `cancel:${item.id}`} onPress={() => press('cancel', item)} />
          )}
        </FriendRow>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl },
  header: { fontFamily: type.weight.bold, fontSize: 12, letterSpacing: type.tracking.wide, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
