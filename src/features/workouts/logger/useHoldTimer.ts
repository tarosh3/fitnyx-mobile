import { useEffect, useRef, useState } from 'react';

import type { HoldTimer } from '@/src/features/workouts/logger/ExerciseBlock';
import { haptic } from '@/src/lib/haptics';

/**
 * Countdown for a timed hold (plank…) on one set row. Runs from an end time,
 * so it stays right if the screen sleeps. Calls onFinish(bi, pi) at 0.
 */
export function useHoldTimer(onFinish: (bi: number, pi: number) => void) {
  const [hold, setHold] = useState<HoldTimer | null>(null);
  const endAt = useRef(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    if (!hold) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      if (left === 0) {
        clearInterval(id);
        haptic.success();
        setHold(null);
        finishRef.current(hold.bi, hold.pi);
      } else {
        setHold((h) => (h ? { ...h, left } : h));
      }
    }, 250);
    return () => clearInterval(id);
  }, [hold?.bi, hold?.pi]);

  const start = (bi: number, pi: number, seconds: number) => {
    endAt.current = Date.now() + seconds * 1000;
    haptic.medium();
    setHold({ bi, pi, left: seconds });
  };

  /** Stops early; returns the seconds held so far. */
  const stop = (total: number): number => {
    const held = hold ? total - hold.left : 0;
    setHold(null);
    return Math.max(0, held);
  };

  return { hold, start, stop };
}
