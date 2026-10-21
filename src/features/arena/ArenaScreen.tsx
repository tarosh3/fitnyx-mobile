import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { Chip, Empty } from '@/src/features/progress/ui/bits';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ArenaBoardKind, ArenaPeriod, ArenaScope } from '@/src/lib/api/arena';
import { spacing } from '@/src/styles/tokens';
import { useArenaBoard, useArenaOptIn } from './data';
import { BOARD_LABEL, PERIOD_LABEL } from './model';
import { ArenaRowView } from './ui/ArenaRowView';
import { StandingCard } from './ui/StandingCard';

const BOARDS: ArenaBoardKind[] = ['grit', 'stride', 'ride'];
const PERIODS: ArenaPeriod[] = ['today', 'week', 'all'];

/** Arena: Grit · Stride · Ride, among friends or worldwide, today / this week / all time (`?board=`). */
export function ArenaScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ board?: string }>();
  const [board, setBoard] = useState<ArenaBoardKind>(BOARDS.includes(params.board as ArenaBoardKind) ? (params.board as ArenaBoardKind) : 'grit');
  const [scope, setScope] = useState<ArenaScope>('friends');
  const [period, setPeriod] = useState<ArenaPeriod>('week');
  const [refreshing, setRefreshing] = useState(false);
  const data = useArenaBoard(board, scope, period);
  const optIn = useArenaOptIn();
  const b = data.data;

  const refresh = async () => {
    setRefreshing(true);
    await data.refresh();
    setRefreshing(false);
  };

  const setListed = async (value: boolean) => {
    try {
      await optIn.save(value);
      toast(value ? 'You’re on the Global boards' : 'You’re off the Global boards');
      await data.refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const onlyMe = scope === 'friends' && b != null && b.rows.length <= 1;

  return (
    <Screen scroll={false} contentContainerStyle={styles.content}>
      <PageHeader title="Arena" subtitle={`${BOARD_LABEL[board].toUpperCase()} · ${PERIOD_LABEL[period].toUpperCase()}`} backTo="/" />
      <SegmentedControl<ArenaBoardKind> value={board} onChange={setBoard} options={BOARDS.map((v) => ({ label: BOARD_LABEL[v], value: v }))} />
      <View style={styles.chips}>
        {(['friends', 'global'] as ArenaScope[]).map((s) => (
          <Chip key={s} testID={`arena-scope-${s}`} label={s === 'friends' ? 'Friends' : 'Global'} active={scope === s} onPress={() => setScope(s)} />
        ))}
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        {PERIODS.map((p) => <Chip key={p} testID={`arena-period-${p}`} label={PERIOD_LABEL[p]} active={period === p} onPress={() => setPeriod(p)} />)}
      </View>

      {!b ? (
        data.loading ? <ActivityIndicator style={styles.spinner} color={c.accent} /> : <Empty text="The Arena needs a connection the first time." />
      ) : (
        <FlatList
          data={b.rows}
          keyExtractor={(r) => r.user.id}
          renderItem={({ item }) => <ArenaRowView row={item} board={board} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
          ListHeaderComponent={<View style={styles.header}><StandingCard board={b} saving={optIn.saving} onListedChange={setListed} /></View>}
          ListEmptyComponent={<Empty text={scope === 'global' ? 'No one is ranked here yet — be the first.' : 'Nothing here yet.'} />}
          ListFooterComponent={onlyMe ? (
            <View style={styles.footer}>
              <Empty text="It’s more fun with friends. Add them by username." />
              <Button testID="arena-add-friends" title="Find friends" variant="secondary" onPress={() => router.push('/friends?tab=find' as never)} />
            </View>
          ) : null}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  divider: { width: StyleSheet.hairlineWidth, height: 24, marginHorizontal: spacing.xs },
  spinner: { marginTop: spacing.xl },
  header: { marginBottom: spacing.sm },
  list: { paddingBottom: spacing['2xl'] },
  footer: { gap: spacing.md, marginTop: spacing.md },
});
