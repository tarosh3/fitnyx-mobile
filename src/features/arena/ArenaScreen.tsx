import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { Empty } from '@/src/features/progress/ui/bits';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ArenaBoardKind, ArenaPeriod, ArenaScope } from '@/src/lib/api/arena';
import { spacing, type } from '@/src/styles/tokens';
import { useArenaBoard, useArenaOptIn } from './data';
import { BOARD_HINT, BOARD_LABEL, isAlone } from './model';
import { AloneCard } from './ui/AloneCard';
import { ArenaHero } from './ui/ArenaHero';
import { ArenaRowView } from './ui/ArenaRowView';
import { ToggleGroup } from './ui/ToggleGroup';

const BOARDS: ArenaBoardKind[] = ['grit', 'stride', 'ride'];
const SCOPES = [{ label: 'Friends', value: 'friends' as const }, { label: 'Global', value: 'global' as const }];
const PERIODS = [{ label: 'Today', value: 'today' as const }, { label: 'Week', value: 'week' as const }, { label: 'All time', value: 'all' as const }];

/** Arena: Grit · Stride · Ride, among friends or worldwide, today / this week / all time (`?board=`, `?scope=`). */
export function ArenaScreen() {
  const c = useThemeColors();
  const toast = useToast();
  const params = useLocalSearchParams<{ board?: string; scope?: string }>();
  const [board, setBoard] = useState<ArenaBoardKind>(BOARDS.includes(params.board as ArenaBoardKind) ? (params.board as ArenaBoardKind) : 'grit');
  const [scope, setScope] = useState<ArenaScope>(params.scope === 'global' ? 'global' : 'friends');
  const [period, setPeriod] = useState<ArenaPeriod>('week');
  const [refreshing, setRefreshing] = useState(false);
  const data = useArenaBoard(board, scope, period);
  const optIn = useArenaOptIn();
  // The switch moves at once; the board's own value takes over after the reload (or snaps back on failure).
  const [listedNow, setListedNow] = useState<boolean | null>(null);
  const b = data.data && listedNow != null ? { ...data.data, me: { ...data.data.me, listed: listedNow } } : data.data;

  const refresh = async () => {
    setRefreshing(true);
    await data.refresh();
    setRefreshing(false);
  };

  const setListed = async (value: boolean) => {
    setListedNow(value);
    try {
      await optIn.save(value);
      toast(value ? 'You’re on the Global boards' : 'You’re off the Global boards', 'success');
      await data.refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setListedNow(null);
    }
  };

  const alone = b != null && isAlone(b);

  return (
    <Screen scroll={false} contentContainerStyle={styles.content}>
      <PageHeader title="Arena" backTo="/" />
      <SegmentedControl<ArenaBoardKind> value={board} onChange={setBoard} options={BOARDS.map((v) => ({ label: BOARD_LABEL[v], value: v }))} />
      <View style={styles.filters}>
        <ToggleGroup testID="arena-scope" options={SCOPES} value={scope} onChange={setScope} />
        <ToggleGroup testID="arena-period" options={PERIODS} value={period} onChange={setPeriod} />
      </View>
      <Text style={[styles.hint, { color: c.mutedText }]}>{BOARD_HINT[board]}</Text>

      {!b ? (
        data.loading ? <ActivityIndicator style={styles.spinner} color={c.accent} /> : <Empty text="The Arena needs a connection the first time." />
      ) : (
        <FlatList
          data={alone ? [] : b.rows}
          keyExtractor={(r) => r.user.id}
          renderItem={({ item }) => <ArenaRowView row={item} board={board} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
          ListHeaderComponent={<View style={styles.hero}><ArenaHero board={b} saving={optIn.saving} onListedChange={setListed} /></View>}
          ListEmptyComponent={alone ? <AloneCard onGlobal={() => setScope('global')} /> : (
            <Empty text={b.me.listed ? 'No one else is ranked here yet.' : 'No one is ranked here yet. Switch on Show me on Global to be the first.'} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0, gap: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  hint: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 18 },
  spinner: { marginTop: spacing.xl },
  hero: { marginBottom: spacing.md },
  list: { paddingBottom: spacing['2xl'] },
});
