import { useEffect, useRef, useState } from 'react';

import type { HoldTimer } from '@/src/features/workouts/logger/ExerciseBlock';
import { haptic } from '@/src/lib/haptics';

/**
 * Clock on one set row, worked out from the wall clock so it stays right if the
 * screen sleeps. A hold (plank…) counts down and calls onFinish(bi, pi) at 0.
 * With `up` (cardio) it counts up until stopped: `left` is then the seconds so far.
 */
export function useHoldTimer(onFinish: (bi: number, pi: number) => void) {
  const [hold, setHold] = useState<HoldTimer | null>(null);
  const endAt = useRef(0);
  const up = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    if (!hold) return;
    const id = setInterval(() => {
      if (up.current) {
        setHold((h) => (h ? { ...h, left: Math.floor((Date.now() - endAt.current) / 1000) } : h));
        return;
      }
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

  const start = (bi: number, pi: number, seconds: number, opts?: { up?: boolean }) => {
    up.current = !!opts?.up;
    endAt.current = up.current ? Date.now() : Date.now() + seconds * 1000;
    haptic.medium();
    setHold({ bi, pi, left: up.current ? 0 : seconds });
  };

  /** Stops early; returns the seconds held so far. */
  const stop = (total: number): number => {
    const held = !hold ? 0 : up.current ? hold.left : total - hold.left;
    setHold(null);
    return Math.max(0, held);
  };

  return { hold, start, stop };
}
