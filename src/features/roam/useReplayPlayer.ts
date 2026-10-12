import { useCallback, useEffect, useRef, useState } from 'react';

import { playbackSeconds, type ReplayTimeline } from '@/src/features/roam/replay';
import { haptic } from '@/src/lib/haptics';

export type ReplayRate = 1 | 2 | 4;

/** Re-render at most this often while playing — smooth on screen, light on the map. */
const FRAME_MS = 50;

export interface ReplayPlayer {
  /** Replay seconds (timeline units); `duration` = the whole route drawn. */
  position: number;
  playing: boolean;
  rate: ReplayRate;
  /** True once a replay has started (until it's reset by reaching the end and stopping). */
  active: boolean;
  play: () => void;
  pause: () => void;
  seek: (sec: number) => void;
  cycleRate: () => void;
}

/**
 * Drives a route replay: a requestAnimationFrame clock that walks the timeline
 * so the whole Roam plays in ~15–40 s at 1×, with a light haptic tick at each
 * km. Starts (and ends) showing the full route.
 */
export function useReplayPlayer(tl: ReplayTimeline | null, movingTimeSec: number): ReplayPlayer {
  const duration = tl?.duration ?? 0;
  const [position, setPosition] = useState(duration);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(false);
  const [rate, setRate] = useState<ReplayRate>(1);
  const pos = useRef(duration);
  const kmIndex = useRef(0);

  // A new timeline (another Roam / first load): show it complete.
  useEffect(() => {
    pos.current = duration;
    setPosition(duration);
    setPlaying(false);
    setActive(false);
  }, [tl, duration]);

  useEffect(() => {
    if (!playing || !tl) return;
    const perMs = (tl.duration / (playbackSeconds(movingTimeSec) * 1000)) * rate;
    let last = Date.now();
    let lastRender = 0;
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      pos.current = Math.min(tl.duration, pos.current + (now - last) * perMs);
      last = now;
      // Haptic tick as each km marker drops.
      while (kmIndex.current < tl.kms.length && tl.kms[kmIndex.current].t <= pos.current) {
        kmIndex.current++;
        haptic.light();
      }
      const done = pos.current >= tl.duration;
      if (done || now - lastRender >= FRAME_MS) {
        lastRender = now;
        setPosition(pos.current);
      }
      if (done) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, tl, rate, movingTimeSec]);

  const seek = useCallback(
    (sec: number) => {
      if (!tl) return;
      pos.current = Math.min(Math.max(sec, 0), tl.duration);
      kmIndex.current = tl.kms.filter((k) => k.t <= pos.current).length;
      setPosition(pos.current);
      setActive(true);
    },
    [tl],
  );

  const play = useCallback(() => {
    if (!tl) return;
    if (pos.current >= tl.duration) seek(0); // finished: start over
    setActive(true);
    setPlaying(true);
  }, [tl, seek]);

  const pause = useCallback(() => setPlaying(false), []);
  const cycleRate = useCallback(() => setRate((r) => (r === 1 ? 2 : r === 2 ? 4 : 1)), []);

  return { position, playing, rate, active, play, pause, seek, cycleRate };
}
