import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandLoader } from '@/src/components/ui/BrandLoader';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AdaptiveProgramCard } from '@/src/features/program/AdaptiveProgramCard';
import { BuildProgramSheet } from '@/src/features/program/BuildProgramSheet';
import { CheckinCard } from '@/src/features/program/CheckinCard';
import { useActiveProgram, useCheckinSeen } from '@/src/features/program/data';
import { NextWorkout } from '@/src/features/program/NextWorkout';
import { BlockHeader, Gains, WeekDays } from '@/src/features/program/ProgramParts';
import { startWorkout } from '@/src/features/workouts/start';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { spacing } from '@/src/styles/tokens';

/** The adaptive program: where you are in the block, the next workout, the weekly review. */
export function ProgramScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const { activeSession, setActiveSession } = useWorkout();
  const { data: program, loading, setData } = useActiveProgram();
  const { seen, markSeen } = useCheckinSeen(program?.id);
  const [freshWeek, setFreshWeek] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [building, setBuilding] = useState(false);

  // A review the user hasn't opened shows highlighted once, then counts as seen.
  const lastWeek = program?.last_checkin?.calendar_week;
  useEffect(() => {
    if (lastWeek == null || seen == null || lastWeek <= seen) return;
    setFreshWeek(lastWeek);
    markSeen(lastWeek);
  }, [lastWeek, seen, markSeen]);

  if (loading) return <Screen><PageHeader title="Your program" backTo="/workouts" /><BrandLoader color={c.primary} /></Screen>;

  const next = program?.days.find((d) => d.id === program.next_day_id) ?? program?.days[0];
  const start = async () => {
    if (!program || !next) return;
    if (activeSession) return router.push(`/workouts/session/${activeSession.id}`);
    setStarting(true);
    try {
      await startWorkout({ planId: program.id, dayId: next.id }, { router, setActiveSession });
    } catch {
      toast('We couldn’t start the workout. Check your connection and try again.', 'error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="Your program" backTo="/workouts" />
      <View style={styles.sections}>
        {!program ? <AdaptiveProgramCard /> : (
          <>
            <BlockHeader program={program} />
            {program.last_checkin && freshWeek === program.last_checkin.calendar_week
              ? <CheckinCard checkin={program.last_checkin} fresh /> : null}
            {program.finished ? (
              <>
                <Gains gains={program.gains} />
                <Button testID="program-next-block" title="Build the next block" onPress={() => setBuilding(true)} />
              </>
            ) : (
              <>
                {next ? <NextWorkout day={next} onStart={start} starting={starting} inProgress={!!activeSession} /> : null}
                <WeekDays program={program} />
              </>
            )}
            {program.last_checkin && freshWeek !== program.last_checkin.calendar_week
              ? <CheckinCard checkin={program.last_checkin} /> : null}
            {program.finished ? null : (
              <Button variant="quiet" title="Start a different program" onPress={() => setBuilding(true)} />
            )}
          </>
        )}
      </View>
      <BuildProgramSheet visible={building} onClose={() => setBuilding(false)}
        onBuilt={(p) => { setBuilding(false); setData(p); toast('Your new program is ready', 'success'); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.lg },
});
