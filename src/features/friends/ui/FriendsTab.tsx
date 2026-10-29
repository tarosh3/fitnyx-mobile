import { IllustratedEmpty } from '@/src/components/art/Illustration';
import { MoreHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { FriendUser } from '@/src/lib/api/friends';
import { spacing, type } from '@/src/styles/tokens';
import { FriendRow } from './FriendRow';

/** The user's friends; ⋯ opens remove / block. */
export function FriendsTab({ friends, loading, onMenu, onFind, onBlocked, onRefresh }: {
  friends: FriendUser[]; loading: boolean;
  onMenu: (user: FriendUser) => void; onFind: () => void; onBlocked: () => void;
  onRefresh: () => Promise<void>;
}) {
  const c = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <FlatList
      data={friends}
      keyExtractor={(u) => u.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
      renderItem={({ item }) => (
        <FriendRow user={item}>
          <Pressable onPress={() => onMenu(item)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`More for @${item.username}`}
            style={styles.more}>
            <MoreHorizontal size={20} color={c.mutedText} />
          </Pressable>
        </FriendRow>
      )}
      ListEmptyComponent={loading ? null : (
        <IllustratedEmpty art="community" title="Better together" detail="No friends yet. Find people by their username." action="Find friends" onAction={onFind} />
      )}
      ListFooterComponent={(
        <Pressable onPress={onBlocked} accessibilityRole="button" style={styles.blocked}>
          <Text style={[styles.blockedText, { color: c.mutedText }]}>Blocked accounts</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  blocked: { alignSelf: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.base },
  blockedText: { fontFamily: type.weight.semibold, fontSize: 13 },
});
