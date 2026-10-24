import type { Router } from 'expo-router';

/**
 * A second navigation within this window is dropped. expo-router queues every
 * push and runs it on the next render, so a fast double tap (or taps queued
 * while the JS thread is busy) stacked the same screen twice and back walked
 * through the copies. Short enough that a deliberate next tap still works.
 */
export const NAV_LOCK_MS = 500;

const guarded = new WeakSet<object>();

/**
 * Throttles the shared `router` (the same object `useRouter()` returns), so
 * every call site is covered: push/navigate share one lock, back/dismiss
 * another (a double-tapped back arrow popped two screens). replace,
 * dismissTo and dismissAll are idempotent for a repeated tap and stay as is.
 */
export function guardNavigation(router: Pick<Router, 'push' | 'navigate' | 'back' | 'dismiss'>, now: () => number = Date.now): void {
  if (guarded.has(router)) return;
  guarded.add(router);

  const lock = () => {
    let last = -Infinity;
    return <A extends unknown[]>(fn: (...args: A) => void) => (...args: A): void => {
      const t = now();
      if (t - last < NAV_LOCK_MS) return;
      last = t;
      fn(...args);
    };
  };
  const forward = lock();
  const backward = lock();
  router.push = forward(router.push);
  router.navigate = forward(router.navigate);
  router.back = backward(router.back);
  router.dismiss = backward(router.dismiss);
}
