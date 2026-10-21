import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useToast } from '@/src/features/workouts/ui/Toast';
import type { FriendUser, Relationship } from '@/src/lib/api/friends';
import { spacing } from '@/src/styles/tokens';
import { applyFriendChange, useFriendRequests, useFriends } from './data';
import { changeMessage, type FriendChange } from './model';
import { BlockedSheet } from './ui/BlockedSheet';
import { FindTab } from './ui/FindTab';
import { FriendMenu } from './ui/FriendMenu';
import { FriendsTab } from './ui/FriendsTab';
import { RequestsTab } from './ui/RequestsTab';

type Tab = 'friends' | 'requests' | 'find';
const TABS: Tab[] = ['friends', 'requests', 'find'];

/** Friends · Requests · Find (`?tab=`). */
export function FriendsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'friends');
  const toast = useToast();
  const friends = useFriends();
  const incoming = useFriendRequests('incoming');
  const outgoing = useFriendRequests('outgoing');
  const [menuFor, setMenuFor] = useState<FriendUser | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const refreshAll = useCallback(async () => {
    await Promise.all([friends.refresh(), incoming.refresh(), outgoing.refresh()]);
  }, [friends.refresh, incoming.refresh, outgoing.refresh]);

  const change = useCallback(async (kind: FriendChange, user: FriendUser): Promise<Relationship | null> => {
    try {
      const result = await applyFriendChange(kind, user.id);
      const message = changeMessage(kind, result, user.username);
      if (message) toast(message);
      refreshAll();
      return result;
    } catch (e) {
      toast((e as Error).message);
      return null;
    }
  }, [toast, refreshAll]);

  const incomingCount = incoming.data?.length ?? friends.data?.incoming_count ?? 0;

  return (
    <Screen scroll={false} contentContainerStyle={styles.content}>
      <PageHeader title="Friends" backTo="/me" />
      <SegmentedControl<Tab> value={tab} onChange={setTab} options={[
        { label: 'Friends', value: 'friends' },
        { label: incomingCount ? `Requests · ${incomingCount}` : 'Requests', value: 'requests' },
        { label: 'Find', value: 'find' },
      ]} />
      <View style={styles.body}>
        {tab === 'friends' ? (
          <FriendsTab friends={friends.data?.friends ?? []} loading={friends.loading} onMenu={setMenuFor}
            onFind={() => setTab('find')} onBlocked={() => setBlockedOpen(true)} onRefresh={refreshAll} />
        ) : tab === 'requests' ? (
          <RequestsTab incoming={incoming.data ?? []} outgoing={outgoing.data ?? []} onChange={change} onRefresh={refreshAll} />
        ) : (
          <FindTab onChange={change} />
        )}
      </View>

      <FriendMenu user={menuFor} onClose={() => setMenuFor(null)} onPick={(kind, user) => {
        setMenuFor(null);
        change(kind, user);
      }} />
      <BlockedSheet visible={blockedOpen} onClose={() => {
        setBlockedOpen(false);
        refreshAll();
      }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0, gap: spacing.md },
  body: { flex: 1 },
});
