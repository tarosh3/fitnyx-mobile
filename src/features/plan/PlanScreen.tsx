import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { Pill } from '@/src/features/workouts/ui/bits';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';
import { usePlan, useStartStarterProgram } from './data';
import { GuidanceCard } from './GuidanceCard';
import { goalLabel } from './model';
import { ProgramPreview } from './ProgramPreview';
import { ScheduleCard } from './ScheduleCard';
import { TargetsCard } from './TargetsCard';

const LOCATION_LABELS: Record<string, string> = {
  home_no_equipment: 'Home, no equipment',
  home_with_equipment: 'Home with equipment',
  gym: 'Gym',
  mix: 'Home + gym',
};

/** Everything the onboarding answers turn into. `?welcome=1` right after onboarding. */
export function PlanScreen() {
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const toast = useToast();
  const space = useBottomBarSpace();
  const plan = usePlan();
  const { start, busy } = useStartStarterProgram();
  const [confirm, setConfirm] = useState(false);
  const first = welcome === '1';

  // A tab switch: reset the stack, then replace (see BottomNav.navigate).
  const goTo = (path: '/' | '/workouts') => {
    if (router.canDismiss()) router.dismissAll();
    router.replace(path);
  };

  const data = plan.data;
  if (!data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.background }]}>
        <TopBar title="Your plan" onBack={first ? () => goTo('/') : undefined} />
        {plan.failed ? (
          <View style={styles.state}>
            <Text style={[styles.h, { color: c.text }]}>Your plan needs a connection</Text>
            <Text style={[styles.body, { color: c.mutedText }]}>Connect to the internet and we’ll build it from your answers.</Text>
            <Button title="Try again" variant="secondary" onPress={plan.refresh} />
          </View>
        ) : <ActivityIndicator style={styles.spinner} color={c.primary} />}
      </View>
    );
  }

  const starterActive = !!data.starter_plan && data.active_plan?.id === data.starter_plan.id;
  const replacing = data.active_plan && !starterActive ? data.active_plan.title : null;
  const days = data.starter_program.days?.length ?? 0;

  const startProgram = async () => {
    try {
      await start();
      setConfirm(false);
      toast('Your starter program is on — today’s workout is on Train', 'success');
      goTo('/workouts');
    } catch {
      toast('Couldn’t start the program. Check your connection and try again.', 'error');
    }
  };
  // After editing the fitness profile: replace the saved starter with the new preview.
  const rebuild = async () => {
    try {
      await start();
      await plan.refresh();
      toast('Program rebuilt from your latest answers', 'success');
    } catch {
      toast('Couldn’t rebuild the program. Check your connection and try again.', 'error');
    }
  };
  const twoButtons = first || starterActive;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <TopBar title="Your plan" subtitle="Built from your answers" onBack={first ? () => goTo('/') : undefined} backLabel={first ? 'Home' : 'Back'} />
      <ScrollView testID="plan-scroll" contentContainerStyle={[styles.content, { paddingBottom: space + (twoButtons ? 64 : 0) }]}>
        {first ? <Text style={[styles.lead, { color: c.text }]}>Here’s where you start. You can change any of it later.</Text> : null}
        <View style={styles.chips}>
          <Pill tone="ok">{goalLabel(data.profile.goal)}</Pill>
          {data.profile.experience ? <Pill>{data.profile.experience[0].toUpperCase() + data.profile.experience.slice(1)}</Pill> : null}
          {LOCATION_LABELS[data.profile.location] ? <Pill>{LOCATION_LABELS[data.profile.location]}</Pill> : null}
        </View>
        <TargetsCard targets={data.targets} missing={data.missing} />
        <ScheduleCard schedule={data.schedule} todayTraining={first ? undefined : data.today.training_day} />
        {days ? <ProgramPreview program={data.starter_program} /> : null}
        <GuidanceCard guidance={data.guidance} />
      </ScrollView>
      <BottomBar>
        {starterActive ? (
          <>
            <Button testID="plan-go-train" title="Go to today’s workout" onPress={() => goTo('/workouts')} />
            {first ? null : <Button testID="plan-rebuild" variant="quiet" title="Rebuild my program" loading={busy} onPress={rebuild} />}
          </>
        ) : (
          <Button testID="plan-start" title="Start my program" loading={busy} disabled={!days}
            onPress={() => (replacing ? setConfirm(true) : startProgram())} />
        )}
        {first ? <Button testID="plan-later" variant="quiet" title="Not now — take me Home" onPress={() => goTo('/')} /> : null}
      </BottomBar>
      <Sheet visible={confirm} title="Switch to your starter program?" subtitle={`This replaces ${replacing ?? 'your program'}.`} onClose={() => setConfirm(false)}
        footer={<><Button title="Switch program" loading={busy} onPress={startProgram} /><Button variant="secondary" title="Keep my program" onPress={() => setConfirm(false)} /></>}>
        <Text style={[styles.body, { color: c.mutedText }]}>Your history and routines stay as they are.</Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  spinner: { marginTop: spacing['3xl'] },
  state: { padding: spacing.base, gap: spacing.md },
  content: { paddingHorizontal: spacing.base, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lead: { fontFamily: type.weight.semibold, fontSize: 17, lineHeight: 24 },
  h: { fontFamily: type.weight.bold, fontSize: 19 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 22 },
});
