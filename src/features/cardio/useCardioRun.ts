import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { activeSecOf, banked, completed, distanceOf, paused, resumed, skipped, timelineSecOf } from '@/src/features/cardio/clock';
import { type Adjust, buildTimeline, changesBetween, changeText, positionAt, spokenChange, targetsFor, warnBefore } from '@/src/features/cardio/engine';
import { machineById } from '@/src/features/cardio/machines';
import { messageAt } from '@/src/features/cardio/messages';
import { programById } from '@/src/features/cardio/programs';
import { type RunState, saveRun } from '@/src/features/cardio/store';
import { hush, say } from '@/src/features/cardio/voice';
import { haptic } from '@/src/lib/haptics';

/** How long "Speed up to 10 km/h" stays up after the change is due. */
const CALLOUT_MS = 6000;
/** A spoken line of encouragement this often, unless a cue is close. */
const VOICE_LINE_SEC = 90;

/**
 * The live run: the clock, what the console should say now and next, and the cues
 * (screen, haptics, voice). Everything comes from `run` plus the time, so a restart
 * picks up exactly where it was.
 */
export function useCardioRun(userId: string, initial: RunState) {
  const [run, setRun] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [callout, setCallout] = useState<{ text: string; until: number } | null>(null);

  const machine = machineById(run.machineId);
  const program = programById(run.programId);
  const timeline = useMemo(() => buildTimeline(program!, run.length, machine, run.comfort), [program, run.length, machine, run.comfort]);

  // Writes on every real change, so a killed app loses seconds at most.
  const commit = useCallback((next: RunState) => {
    setRun(next);
    saveRun(userId, next).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => hush, []);

  const startsIn = Math.max(0, Math.ceil((run.startedAtMs - now) / 1000));
  const isPaused = run.pausedAtMs != null;
  const activeSec = activeSecOf(run, now);
  const sec = timelineSecOf(run, now);
  const pos = positionAt(timeline, sec);
  const targets = targetsFor(pos.phase, machine, run.comfort, run.adjust);
  const nextTargets = pos.next ? targetsFor(pos.next, machine, run.comfort, run.adjust) : null;
  const changes = nextTargets ? changesBetween(targets, nextTargets) : [];
  const warnSec = warnBefore(pos.phase);
  const warning = pos.next && pos.leftSec <= warnSec && startsIn === 0 ? { inSec: Math.ceil(pos.leftSec), text: changeText(machine, changes), changes } : null;
  const distanceM = distanceOf(run, timeline, machine, now);
  const message = messageAt(pos, sec, timeline.totalSec);

  const speak = useCallback((text: string) => { if (run.voice) say(text); }, [run.voice]);

  // --- Cues. Each fires once: the ref remembers the last one per kind. ---
  const fired = useRef<{ phase: number; warned: number; beat: number; line: number; started: boolean }>({ phase: pos.phase.index, warned: -1, beat: -1, line: Math.floor(sec / VOICE_LINE_SEC), started: activeSec > 0 });
  const live = !isPaused && !run.finished && startsIn === 0;

  useEffect(() => {
    if (run.finished || isPaused) return;
    if (startsIn > 0) { haptic.light(); return; }
    if (!fired.current.started) {
      fired.current.started = true;
      haptic.heavy();
      speak(`${pos.phase.name}. ${changeText(machine, [{ dial: 'primary', dir: 'up', to: targets.primary }]).replace(/^.* to /, 'Set to ')}`);
    }
  }, [startsIn, run.finished, isPaused]);

  // The change is coming.
  useEffect(() => {
    if (!live || !warning || fired.current.warned === pos.phase.index) return;
    fired.current.warned = pos.phase.index;
    haptic.medium();
    speak(changes.length ? `In ${warning.inSec} seconds, ${spokenChange(machine, changes)}` : `${pos.next?.name ?? 'Next'} in ${warning.inSec} seconds. Hold this pace.`);
  }, [live, warning?.inSec, pos.phase.index]);

  // The last three seconds tick on the wrist/hand.
  useEffect(() => {
    if (!live || !warning || warning.inSec > 3 || fired.current.beat === warning.inSec) return;
    fired.current.beat = warning.inSec;
    haptic.light();
  }, [live, warning?.inSec]);

  // The change is now.
  const previous = useRef(targets);
  useEffect(() => {
    if (fired.current.phase === pos.phase.index) { previous.current = targets; return; }
    fired.current.phase = pos.phase.index;
    fired.current.beat = -1;
    const due = changesBetween(previous.current, targets);
    previous.current = targets;
    if (run.finished) return;
    haptic.heavy();
    const text = due.length ? changeText(machine, due) : pos.phase.name;
    setCallout({ text, until: Date.now() + CALLOUT_MS });
    speak(due.length ? `Now. ${spokenChange(machine, due)}` : pos.phase.name);
  }, [pos.phase.index]);

  useEffect(() => { if (callout && now >= callout.until) setCallout(null); }, [now, callout]);

  // A line of encouragement now and then, never over a cue.
  useEffect(() => {
    if (!live) return;
    const line = Math.floor(sec / VOICE_LINE_SEC);
    if (line === fired.current.line) return;
    fired.current.line = line;
    if (!warning && !callout) speak(message);
  }, [live, Math.floor(sec / VOICE_LINE_SEC)]);

  // The end of the program.
  useEffect(() => {
    if (!pos.done || run.finished) return;
    haptic.success();
    speak('Program complete. Brilliant work.');
    commit(completed(run, timeline, machine, Date.now()));
  }, [pos.done, run.finished]);

  // Bank the distance from time to time for a crash.
  useEffect(() => {
    if (live) commit(banked(run, timeline, machine, Date.now()));
  }, [Math.floor(sec / 10)]);

  const pause = useCallback(() => { haptic.medium(); hush(); commit(paused(run, timeline, machine, Date.now())); }, [run, timeline, machine, commit]);
  const resume = useCallback(() => { haptic.medium(); commit(resumed(run, Date.now())); setNow(Date.now()); }, [run, commit]);
  const skip = useCallback(() => { haptic.medium(); commit(skipped(run, timeline, machine, Date.now())); setNow(Date.now()); }, [run, timeline, machine, commit]);
  const stop = useCallback(() => { hush(); commit({ ...paused(run, timeline, machine, Date.now()), finished: true }); }, [run, timeline, machine, commit]);
  const toggleVoice = useCallback(() => { if (run.voice) hush(); commit({ ...run, voice: !run.voice }); }, [run, commit]);
  /** Too hard / too easy: this and every later phase move by a console step. */
  const nudge = useCallback((dial: keyof Adjust, dir: 1 | -1) => {
    const d = dial === 'primary' ? machine.primary : machine.secondary;
    if (!d) return;
    haptic.selection();
    const next = banked(run, timeline, machine, Date.now());
    commit({ ...next, adjust: { ...next.adjust, [dial]: next.adjust[dial] + dir * d.step } });
  }, [run, timeline, machine, commit]);
  const setDistance = useCallback((metres: number) => commit({ ...run, distanceM: metres, countedSec: Math.min(timeline.totalSec, timelineSecOf(run, Date.now())) }), [run, timeline, commit]);

  return { run, machine, program: program!, timeline, startsIn, isPaused, activeSec, sec, pos, targets, nextTargets, warning, callout, distanceM, message, pause, resume, skip, stop, nudge, toggleVoice, setDistance };
}
