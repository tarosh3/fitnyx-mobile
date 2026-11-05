import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { Pause, Play, SkipForward, Volume2, VolumeX, X, Zap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { learnedComfort, ZONE_LABELS, zoneOf } from '@/src/features/cardio/engine';
import { finishLine } from '@/src/features/cardio/messages';
import { phasesOf } from '@/src/features/cardio/programs';
import { logRun, MIN_SAVE_SEC } from '@/src/features/cardio/finish';
import { bestBefore, clearRun, loadHistory, type RunState, setFinishedLog, timesDone } from '@/src/features/cardio/store';
import { DialCard } from '@/src/features/cardio/ui/DialCard';
import { DoneView } from '@/src/features/cardio/ui/DoneView';
import { PhaseGraph } from '@/src/features/cardio/ui/PhaseGraph';
import { useCardioRun } from '@/src/features/cardio/useCardioRun';
import { fmtClock } from '@/src/features/workouts/model';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

/** The screen a guided run happens on. It never sleeps, and reads from across a treadmill. */
export function LiveScreen({ userId, initial }: { userId: string; initial: RunState }) {
  useKeepAwake('cardio-run');
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeSession, finishActiveSession, abandonActiveSession, pauseActiveSession, resumeActiveSession } = useWorkout();
  const r = useCardioRun(userId, initial);
  const [ending, setEnding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<string | null>(null);
  const leaving = useRef(false);

  // System back asks first, like ✕: it mustn't drop a running program.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!r.run.finished) setEnding(true);
      return true;
    });
    return () => sub.remove();
  }, [r.run.finished]);

  // What's to celebrate, worked out once when the run ends (before it's added to the history).
  useEffect(() => {
    if (!r.run.finished) return;
    let alive = true;
    loadHistory(userId).then((history) => {
      if (!alive) return;
      const best = bestBefore(history, r.run.programId);
      const count = timesDone(history, r.run.programId) + 1;
      const further = best && r.distanceM - best.distanceM >= 50 ? ` · ${Math.round(r.distanceM - best.distanceM)} m further than your best` : '';
      setRecord(count > 1 || further ? `${ordinal(count)} time${further}` : 'First time on this program. Now you have a number to beat.');
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [r.run.finished]);

  const togglePause = () => {
    if (r.isPaused) { r.resume(); resumeActiveSession().catch(() => undefined); }
    else { r.pause(); pauseActiveSession().catch(() => undefined); }
  };

  const finish = async () => {
    if (leaving.current) return;
    leaving.current = true;
    setBusy(true);
    setError(null);
    try {
      await logRun(userId, r.run);
      await finishActiveSession();
      router.replace(`/workouts/summary/${r.run.sessionId}`);
    } catch {
      leaving.current = false;
      setError('Couldn’t save your run. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const toWorkout = async () => {
    if (leaving.current) return;
    leaving.current = true;
    setBusy(true);
    setError(null);
    try {
      setFinishedLog(await logRun(userId, r.run));
      if (activeSession?.status === 'paused') await resumeActiveSession().catch(() => undefined);
      router.dismissTo(`/workouts/session/${r.run.sessionId}`);
    } catch {
      leaving.current = false;
      setError('Couldn’t save your run. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (leaving.current) return;
    leaving.current = true;
    setBusy(true);
    await clearRun(userId).catch(() => undefined);
    try {
      if (r.run.ownsSession) {
        await abandonActiveSession().catch(() => undefined);
        router.dismissTo('/cardio');
      } else {
        if (activeSession?.status === 'paused') await resumeActiveSession().catch(() => undefined);
        router.dismissTo(`/workouts/session/${r.run.sessionId}`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (r.run.finished) {
    const learned = learnedComfort(r.machine, r.run.comfort, r.run.adjust);
    const moved = learned.primary !== r.run.comfort.primary;
    return (
      <DoneView title={r.run.programTitle} line={finishLine(r.pos.progress)} activeSec={r.activeSec} distanceM={r.distanceM} estimated={r.machine.estimatesDistance}
        record={r.activeSec >= MIN_SAVE_SEC ? record : null}
        learned={moved ? `You moved things around, so next time you’ll start from ${learned.primary}${r.machine.primary.unit === 'level' ? '' : ` ${r.machine.primary.unit}`}.` : null}
        owns={r.run.ownsSession} busy={busy} error={error} onDistance={r.setDistance} onFinish={finish} onContinue={toWorkout} onDiscard={discard} />
    );
  }

  const zone = zoneOf(r.pos.phase);
  const tone = c.routeRamp[zone];
  const banner = r.warning
    ? { key: 'warn', kicker: `In ${r.warning.inSec} s`, text: r.warning.text }
    : r.callout ? { key: 'now', kicker: 'Now', text: r.callout.text } : null;
  const phaseCount = r.timeline.phases.length;

  return (
    <View testID="cardio-live" style={[styles.fill, { backgroundColor: c.background, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.top}>
        <Pressable testID="cardio-end" onPress={() => setEnding(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="End program"
          style={({ pressed }) => [styles.icon, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          <X size={22} color={c.text} />
        </Pressable>
        <View style={styles.titles}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{r.run.programTitle}</Text>
          <Text style={[styles.subtitle, { color: c.mutedText }]} numberOfLines={1}>{r.machine.label} · Step {r.pos.phase.index + 1} of {phaseCount}</Text>
        </View>
        <Pressable testID="cardio-voice" onPress={r.toggleVoice} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: r.run.voice }} accessibilityLabel="Voice cues"
          style={({ pressed }) => [styles.icon, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          {r.run.voice ? <Volume2 size={22} color={c.text} /> : <VolumeX size={22} color={c.mutedText} />}
        </Pressable>
      </View>

      <View testID="cardio-hero" style={[styles.hero, { backgroundColor: c.card, borderColor: tone }]}>
        {r.startsIn > 0 ? (
          <>
            <Text style={[styles.phase, { color: c.mutedText }]}>Set your machine, then</Text>
            <Text style={[styles.clock, { color: c.text }]} accessibilityLiveRegion="polite">{r.startsIn}</Text>
          </>
        ) : (
          <>
            <View style={styles.phaseRow}>
              <View style={[styles.dot, { backgroundColor: tone }]} />
              <Text style={[styles.phase, { color: c.text }]} numberOfLines={1}>{r.pos.phase.name}</Text>
              <Text style={[styles.zone, { color: c.mutedText }]} numberOfLines={1}>{ZONE_LABELS[zone]}</Text>
            </View>
            <Text style={[styles.clock, { color: c.text }]} accessibilityLabel={`${Math.round(r.pos.leftSec)} seconds left in this step`}>{fmtClock(Math.ceil(r.pos.leftSec))}</Text>
            <Text style={[styles.upNext, { color: c.mutedText }]} numberOfLines={1}>{r.isPaused ? 'Paused' : r.pos.next ? `Up next: ${r.pos.next.name}` : 'Last step. Finish strong!'}</Text>
          </>
        )}
      </View>

      <View testID="cardio-banner" style={[styles.banner, banner ? { backgroundColor: tone } : { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
        {banner ? (
          <>
            <View style={styles.bannerHead}><Zap size={16} color={c.primaryText} /><Text style={[styles.kicker, { color: c.primaryText }]}>{banner.kicker}</Text></View>
            <Text style={[styles.bannerText, { color: c.primaryText }]} numberOfLines={2} adjustsFontSizeToFit>{banner.text}</Text>
          </>
        ) : (
          <Text testID="cardio-message" style={[styles.message, { color: c.text }]} numberOfLines={2}>{r.startsIn > 0 ? 'Here we go.' : r.message}</Text>
        )}
      </View>

      <View style={styles.dials}>
        <DialCard testID="dial-primary" dial={r.machine.primary} value={r.targets.primary} next={r.nextTargets?.primary ?? null} onNudge={(d) => r.nudge('primary', d)} />
        {r.machine.secondary && r.targets.secondary != null ? (
          <DialCard testID="dial-secondary" dial={r.machine.secondary} value={r.targets.secondary} next={r.nextTargets?.secondary ?? null} onNudge={(d) => r.nudge('secondary', d)} />
        ) : null}
      </View>

      <View style={styles.graph}>
        <PhaseGraph testID="cardio-graph" phases={phasesOf(r.program, r.run.length)} progress={r.pos.progress} height={48} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={[styles.statValue, { color: c.text }]}>{fmtClock(r.activeSec)}</Text><Text style={[styles.statLabel, { color: c.mutedText }]}>Time</Text></View>
        {r.machine.estimatesDistance ? <View style={styles.stat}><Text style={[styles.statValue, { color: c.text }]}>{(r.distanceM / 1000).toFixed(2)}</Text><Text style={[styles.statLabel, { color: c.mutedText }]}>km</Text></View> : null}
        <View style={styles.stat}><Text style={[styles.statValue, { color: c.text }]}>{fmtClock(Math.ceil(r.pos.totalLeftSec))}</Text><Text style={[styles.statLabel, { color: c.mutedText }]}>Left</Text></View>
      </View>

      <View style={styles.controls}>
        <Pressable testID="cardio-pause" onPress={togglePause} accessibilityRole="button" accessibilityLabel={r.isPaused ? 'Resume' : 'Pause'}
          style={({ pressed }) => [styles.main, { backgroundColor: c.primary }, pressed && { opacity: 0.85 }]}>
          {r.isPaused ? <Play size={24} color={c.primaryText} fill={c.primaryText} /> : <Pause size={24} color={c.primaryText} fill={c.primaryText} />}
          <Text style={[styles.mainText, { color: c.primaryText }]}>{r.isPaused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
        <Pressable testID="cardio-skip" onPress={r.skip} accessibilityRole="button" accessibilityLabel="Skip to the next step"
          style={({ pressed }) => [styles.side, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          <SkipForward size={22} color={c.text} />
          <Text style={[styles.sideText, { color: c.text }]}>Skip</Text>
        </Pressable>
      </View>

      <Sheet visible={ending} title="End this program?" subtitle={`${fmtClock(r.pos.totalLeftSec)} to go. What you’ve done still counts.`} onClose={() => setEnding(false)} testID="cardio-end-sheet"
        footer={<>
          <Button testID="cardio-keep-going" title="Keep going" onPress={() => setEnding(false)} />
          <Button testID="cardio-stop" variant="secondary" title="Stop here" onPress={() => { setEnding(false); r.stop(); pauseActiveSession().catch(() => undefined); }} />
        </>}>
        <View />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: spacing.base, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, minWidth: 0 },
  title: { fontFamily: type.weight.bold, fontSize: 18 },
  subtitle: { fontFamily: type.weight.regular, fontSize: 13 },
  hero: { flexShrink: 1, flexGrow: 1, minHeight: 150, justifyContent: 'center', alignItems: 'center', borderRadius: radii.xl, borderWidth: 2, padding: spacing.md },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  phase: { flexShrink: 1, fontFamily: type.weight.bold, fontSize: 20 },
  zone: { flexShrink: 1, fontFamily: type.weight.medium, fontSize: 14 },
  clock: { fontFamily: type.weight.extrabold, fontSize: 76, lineHeight: 86, fontVariant: ['tabular-nums'] },
  upNext: { fontFamily: type.weight.medium, fontSize: 15 },
  banner: { minHeight: 76, borderRadius: radii.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, justifyContent: 'center' },
  bannerHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kicker: { fontFamily: type.weight.bold, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' },
  bannerText: { fontFamily: type.weight.extrabold, fontSize: 20, lineHeight: 25 },
  message: { fontFamily: type.weight.semibold, fontSize: 17, lineHeight: 23, textAlign: 'center' },
  dials: { flexDirection: 'row', gap: spacing.sm },
  graph: { paddingTop: spacing.xs },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontFamily: type.weight.extrabold, fontSize: 20, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: type.weight.medium, fontSize: 12 },
  controls: { flexDirection: 'row', gap: spacing.sm },
  main: { flex: 1, minHeight: 60, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  mainText: { fontFamily: type.weight.bold, fontSize: 18 },
  side: { width: 92, minHeight: 60, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sideText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
