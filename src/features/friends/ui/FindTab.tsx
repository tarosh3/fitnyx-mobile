import { BrandLoader } from '@/src/components/ui/BrandLoader';
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { Empty } from '@/src/features/progress/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { FriendUser, Relationship } from '@/src/lib/api/friends';
import { spacing } from '@/src/styles/tokens';
import { useUserSearch } from '../data';
import { relationshipButton, type FriendChange } from '../model';
import { FriendRow, RowButton } from './FriendRow';

/** Find people by username and add them. */
export function FindTab({ onChange }: { onChange: (change: FriendChange, user: FriendUser) => Promise<Relationship | null> }) {
  const c = useThemeColors();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const search = useUserSearch(text);

  const press = async (change: FriendChange, user: FriendUser) => {
    setBusy(user.id);
    const next = await onChange(change, user);
    setBusy(null);
    if (next) search.setRelationship(user.id, next);
  };

  const empty = !search.query
    ? 'Search by username to add friends.'
    : search.error ?? (search.loading ? null : `No one found for “${search.query}”.`);

  return (
    <View style={styles.wrap}>
      <Input testID="friend-search" value={text} onChangeText={setText} placeholder="Search @username" autoCapitalize="none"
        autoCorrect={false} autoComplete="off" returnKeyType="search" maxLength={31} accessibilityLabel="Search by username" />
      <FlatList
        data={search.results}
        keyExtractor={(u) => u.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const button = relationshipButton(item.relationship);
          return (
            <FriendRow user={item}>
              <RowButton testID={`friend-action-${item.username}`} label={button.label} primary={button.primary} busy={busy === item.id}
                onPress={button.action ? () => press(button.action!, item) : undefined} />
            </FriendRow>
          );
        }}
        ListEmptyComponent={search.loading && !search.results.length
          ? <BrandLoader style={styles.spinner} color={c.accent} />
          : empty ? <Empty text={empty} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md },
  list: { paddingBottom: spacing.xl },
  spinner: { marginTop: spacing.xl },
});
