import { buildTimeline, changesBetween, changeText, distanceOver, learnedComfort, positionAt, spokenChange, targetsFor, warnBefore, zoneOf } from '@/src/features/cardio/engine';
import { activeSecOf, banked, distanceOf, paused, resumed, skipped, timelineSecOf } from '@/src/features/cardio/clock';
import { machineById, machineForExercise, MACHINES } from '@/src/features/cardio/machines';
import { finishLine, messageAt } from '@/src/features/cardio/messages';
import { type Program, minutesOf, phasesOf, PROGRAMS, suggestedGoal } from '@/src/features/cardio/programs';

const treadmill = machineById('treadmill');
const comfort = { primary: 10, secondary: 1, decline: false };
const noAdjust = { primary: 0, secondary: 0 };
const program: Program = {
  id: 't', title: 'T', goal: 'speed', level: 'Hard', blurb: '',
  intro: [{ name: 'Warm', sec: 60, pace: 0.6 }],
  loop: [{ name: 'Push', sec: 30, pace: 1.3, climb: 2 }, { name: 'Down', sec: 30, pace: 0.7, climb: -3 }],
  reps: { short: 1, standard: 2, long: 3 },
  outro: [],
};

describe('programs', () => {
  it('every program runs at every length on every machine, within the console limits', () => {
    for (const prog of PROGRAMS) {
      for (const length of ['short', 'standard', 'long'] as const) {
        const phases = phasesOf(prog, length);
        expect(phases.length).toBeGreaterThan(0);
        for (const machine of MACHINES) {
          for (const c of [{ primary: machine.primary.min, secondary: machine.secondary?.min ?? 0, decline: true }, { primary: machine.primary.max, secondary: machine.secondary?.max ?? 0, decline: false }]) {
            for (const ph of buildTimeline(prog, length, machine, c).phases) {
              expect(ph.base.primary).toBeGreaterThanOrEqual(machine.primary.min);
              expect(ph.base.primary).toBeLessThanOrEqual(machine.primary.max);
              expect(Number.isFinite(ph.base.primary)).toBe(true);
            }
          }
        }
      }
    }
  });

  it('short ≤ standard ≤ long, and ids are unique', () => {
    for (const prog of PROGRAMS) {
      expect(minutesOf(prog, 'short')).toBeLessThanOrEqual(minutesOf(prog, 'standard'));
      expect(minutesOf(prog, 'standard')).toBeLessThanOrEqual(minutesOf(prog, 'long'));
    }
    expect(new Set(PROGRAMS.map((x) => x.id)).size).toBe(PROGRAMS.length);
  });

  it('every goal has a program', () => {
    for (const goal of ['warmup', 'fatloss', 'stamina', 'speed', 'hills', 'recovery']) {
      expect(PROGRAMS.some((x) => x.goal === goal)).toBe(true);
    }
  });

  it('every goal still has a program on machines other than a treadmill', () => {
    for (const goal of ['warmup', 'fatloss', 'stamina', 'speed', 'hills', 'recovery']) {
      expect(PROGRAMS.some((x) => x.goal === goal && !x.treadmillOnly)).toBe(true);
    }
  });

  it('suggests a warm-up before lifting and a finisher after', () => {
    expect(suggestedGoal({ inWorkout: true, setsLogged: 0 })).toBe('warmup');
    expect(suggestedGoal({ inWorkout: true, setsLogged: 5 })).toBe('fatloss');
    expect(suggestedGoal({ inWorkout: false, setsLogged: 0, profileGoal: 'lose_fat' })).toBe('fatloss');
    expect(suggestedGoal({ inWorkout: false, setsLogged: 0, profileGoal: 'build_muscle' })).toBe('stamina');
  });
});

describe('timeline', () => {
  const t = buildTimeline(program, 'short', treadmill, comfort);

  it('scales to what the user finds comfortable, on the console step', () => {
    expect(t.totalSec).toBe(120);
    expect(t.phases[0].base).toEqual({ primary: 6, secondary: 1 });
    expect(t.phases[1].base).toEqual({ primary: 13, secondary: 3 });
    expect(buildTimeline(program, 'short', treadmill, { ...comfort, primary: 5.5 }).phases[1].base.primary).toBe(7);
  });

  it('holds incline at 0 unless the treadmill can decline', () => {
    expect(t.phases[2].base.secondary).toBe(0);
    expect(buildTimeline(program, 'short', treadmill, { ...comfort, decline: true }).phases[2].base.secondary).toBe(-2);
  });

  it('finds the position, next phase and what is left', () => {
    const at = positionAt(t, 75);
    expect(at.phase.name).toBe('Push');
    expect(at.next?.name).toBe('Down');
    expect(at.leftSec).toBe(15);
    expect(at.totalLeftSec).toBe(45);
    expect(at.done).toBe(false);
    const end = positionAt(t, 500);
    expect(end.done).toBe(true);
    expect(end.leftSec).toBe(0);
    expect(end.progress).toBe(1);
    expect(end.next).toBeNull();
  });

  it('a phase boundary belongs to the next phase', () => {
    expect(positionAt(t, 60).phase.name).toBe('Push');
  });

  it('applies live changes to every remaining phase, within the limits', () => {
    expect(targetsFor(t.phases[1], treadmill, comfort, { primary: -1, secondary: 1 })).toEqual({ primary: 12, secondary: 4 });
    expect(targetsFor(t.phases[2], treadmill, comfort, { primary: -50, secondary: -50 })).toEqual({ primary: 1, secondary: 0 });
  });

  it('works out treadmill distance across phases with the live change', () => {
    // 6 km/h for 60 s = 100 m; 13 km/h for 30 s ≈ 108.3 m
    expect(distanceOver(t, treadmill, comfort, noAdjust, 0, 90)).toBeCloseTo(208.33, 1);
    expect(distanceOver(t, treadmill, comfort, { primary: 1, secondary: 0 }, 0, 60)).toBeCloseTo(116.67, 1);
    expect(distanceOver(t, machineById('bike'), comfort, noAdjust, 0, 90)).toBe(0);
  });
});

describe('cues', () => {
  it('words a change on either dial, and says when nothing changes', () => {
    const changes = changesBetween({ primary: 8, secondary: 1 }, { primary: 10, secondary: 0 });
    expect(changeText(treadmill, changes)).toBe('Speed up to 10 km/h · Lower the incline to 0%');
    expect(spokenChange(treadmill, changes)).toBe('Speed up to 10 kilometres an hour, Lower the incline to 0 percent');
    expect(changeText(treadmill, changesBetween({ primary: 8, secondary: 1 }, { primary: 8, secondary: 1 }))).toBe('Hold this pace');
    expect(changeText(machineById('bike'), [{ dial: 'primary', dir: 'up', to: 9 }])).toBe('Add resistance to level 9');
  });

  it('gives less warning on a short phase', () => {
    expect(warnBefore({ sec: 30 })).toBe(5);
    expect(warnBefore({ sec: 120 })).toBe(10);
  });

  it('bands effort, counting the hill', () => {
    expect(zoneOf({ pace: 0.6 })).toBe(0);
    expect(zoneOf({ pace: 1 })).toBe(2);
    expect(zoneOf({ pace: 0.62, climb: 10 })).toBe(2);
    expect(zoneOf({ pace: 1.35 })).toBe(4);
  });
});

describe('messages', () => {
  const t = buildTimeline(program, 'long', treadmill, comfort);

  it('is stable for a moment, changes over time, and calls out milestones', () => {
    const at = (sec: number) => messageAt(positionAt(t, sec), sec, t.totalSec);
    expect(at(5)).toBe(at(6));
    expect(at(5)).not.toBe(at(35));
    expect(at(t.totalSec * 0.5 + 1)).toMatch(/Halfway/);
    expect(at(t.totalSec - 10)).toMatch(/Last minute/);
  });

  it('closes kindly however far you got', () => {
    expect(finishLine(1)).toMatch(/Program done/);
    expect(finishLine(0.1)).toMatch(/showed up/);
  });
});

describe('learned comfort', () => {
  it('starts next time from what the user settled on', () => {
    expect(learnedComfort(treadmill, comfort, { primary: -1, secondary: 0.5 })).toEqual({ primary: 9, secondary: 1.5, decline: false });
  });
});

describe('machineForExercise', () => {
  it('finds machines, by id then by name, and no program for a jump rope', () => {
    expect(machineForExercise({ uuid: treadmill.exerciseUuid, title: 'Treadmill Run' })?.id).toBe('treadmill');
    expect(machineForExercise({ uuid: 'x', title: 'Incline Treadmill Walk' })?.id).toBe('treadmill');
    expect(machineForExercise({ uuid: 'x', title: 'Recumbent Bike' })?.id).toBe('bike');
    expect(machineForExercise({ uuid: 'x', title: 'Jump Rope' })).toBeNull();
    expect(machineForExercise(null)).toBeNull();
  });
});

describe('run clock', () => {
  const t = buildTimeline(program, 'short', treadmill, comfort);
  const run = {
    programId: 't', programTitle: 'T', machineId: 'treadmill' as const, exerciseUuid: 'u', length: 'short' as const, comfort, adjust: noAdjust,
    startedAtMs: 1000, pausedTotalMs: 0, pausedAtMs: null, skippedSec: 0, distanceM: 0, countedSec: 0, sessionId: 's', ownsSession: true, voice: true, finished: false,
  };

  it('does not start before the 3-2-1 is over', () => {
    expect(activeSecOf(run, 500)).toBe(0);
    expect(activeSecOf(run, 11000)).toBe(10);
  });

  it('leaves paused time out, through a pause and resume', () => {
    const p = paused(run, t, treadmill, 11000);
    expect(activeSecOf(p, 99000)).toBe(10);
    expect(p.distanceM).toBeCloseTo(16.67, 1);
    const r = resumed(p, 99000);
    expect(activeSecOf(r, 104000)).toBe(15);
    expect(distanceOf(r, t, treadmill, 104000)).toBeCloseTo(25, 1);
  });

  it('skip moves the program on without adding training time or distance', () => {
    const s = skipped(run, t, treadmill, 11000);
    expect(activeSecOf(s, 11000)).toBe(10);
    expect(timelineSecOf(s, 11000)).toBe(60);
    expect(distanceOf(s, t, treadmill, 11000)).toBeCloseTo(16.67, 1);
    // 10 s later, now on the 13 km/h phase: 36 m more.
    expect(distanceOf(s, t, treadmill, 21000)).toBeCloseTo(16.67 + 36.11, 1);
  });

  it('a speed change only affects distance from then on', () => {
    const b = { ...banked(run, t, treadmill, 11000), adjust: { primary: 1, secondary: 0 } };
    expect(distanceOf(b, t, treadmill, 21000)).toBeCloseTo(16.67 + 19.44, 1);
  });
});
