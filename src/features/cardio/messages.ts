import { zoneOf, type Position } from '@/src/features/cardio/engine';

const BY_ZONE: string[][] = [
  ['Breathe easy. You earned this.', 'Let your shoulders drop.', 'Easy now. This is part of the work.', 'Slow is still moving. Keep going.', 'Get your breath back. More to come.'],
  ['Nice and steady.', 'You could do this all day.', 'Stay relaxed, stay tall.', 'Find a rhythm and sit in it.', 'This is where fitness gets built.'],
  ['This is your pace. Own it.', 'Strong and smooth.', 'Feels good, doesn’t it?', 'Keep your arms moving.', 'You’re doing what most people skipped today.'],
  ['This is the part that counts.', 'Hard is the point. Stay with it.', 'Short breaths, strong legs.', 'You’ve done harder than this.', 'Don’t look at the clock. Look ahead.'],
  ['Everything you’ve got!', 'Go go go!', 'This is why you came.', 'Empty the tank!', 'Almost there. Don’t you dare slow down.'],
];

/** Once per run, at these points through the program; they beat the rotating lines. */
const MILESTONES: [number, string][] = [
  [0.25, 'A quarter done. You’re warmed up now.'],
  [0.5, 'Halfway! It’s all downhill from here.'],
  [0.75, 'Three quarters down. Finish what you started.'],
];

/** How long a line stays up. */
const LINE_SEC = 30;

/** The line to show now. Pure: the same moment always gives the same words. */
export function messageAt(pos: Position, sec: number, totalSec: number): string {
  if (pos.totalLeftSec <= 60 && pos.totalLeftSec > 0) return 'Last minute. Make it count!';
  for (const [at, text] of MILESTONES) {
    const from = at * totalSec;
    if (sec >= from && sec < from + LINE_SEC) return text;
  }
  const lines = BY_ZONE[zoneOf(pos.phase)];
  return lines[(pos.phase.index + Math.floor(sec / LINE_SEC)) % lines.length];
}

/** The closing line, picked by how much of the program was done. */
export function finishLine(progress: number): string {
  if (progress >= 0.99) return 'Program done. That’s the work most people never do.';
  if (progress >= 0.5) return 'Good work. More than halfway still counts.';
  return 'You showed up, and that’s what builds the habit.';
}
