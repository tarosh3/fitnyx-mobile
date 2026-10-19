import { useCallback, useEffect, useRef, useState } from 'react';

import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { type AiReportStatus, fetchAiReport, requestAiReport } from '@/src/lib/api/reports';

const POLL_MS = 3000;
/** The backend gives a generation 4 minutes (Groq, then NVIDIA). */
const POLL_LIMIT_MS = 4.5 * 60 * 1000;

/**
 * The AI report: locked until 10 training days, one new report per week.
 * `generate()` returns this week's report or starts a new one and polls until
 * it's written. The last status is cached so a written report opens offline.
 */
export function useAiReport(userId: string | undefined) {
  const [status, setStatus] = useState<AiReportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const key = userId ? cacheKeys.aiReport(userId) : null;

  const save = useCallback((st: AiReportStatus) => {
    if (!alive.current) return;
    setStatus(st);
    if (key) cacheSet(key, st, cacheTTL.DAY).catch(() => undefined);
  }, [key]);

  const poll = useCallback(async () => {
    const until = Date.now() + POLL_LIMIT_MS;
    while (alive.current && Date.now() < until) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (!alive.current) return;
      try {
        const st = await fetchAiReport();
        save(st);
        if (!st.generating) {
          if (!st.report || (st.next_available_at === null)) setError('Couldn’t write your report. Try again in a few minutes.');
          return;
        }
      } catch {
        // A dropped poll is fine; keep waiting.
      }
    }
    if (alive.current) setError('This is taking longer than usual. Check back in a minute.');
  }, [save]);

  useEffect(() => {
    alive.current = true;
    (async () => {
      if (key) {
        const cached = await cacheGetStale<AiReportStatus>(key);
        if (cached && alive.current) setStatus({ ...cached, generating: false });
      }
      try {
        const st = await fetchAiReport();
        save(st);
        if (st.generating) void poll();
      } catch (e) {
        if (alive.current && (e as { status?: number }).status) setError('Couldn’t load your AI report.');
      } finally {
        if (alive.current) setLoading(false);
      }
    })();
    return () => { alive.current = false; };
  }, [key, save, poll]);

  const generate = useCallback(async () => {
    setError(null);
    try {
      const st = await requestAiReport();
      save(st);
      if (st.generating) await poll();
    } catch (e) {
      const err = e as { status?: number; message?: string };
      setError(err.status ? err.message ?? 'Couldn’t start your report.' : 'You’re offline — try again when connected.');
    }
  }, [save, poll]);

  return { status, loading, error, generate };
}
