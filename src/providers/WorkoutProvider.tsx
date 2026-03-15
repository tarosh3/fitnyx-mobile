import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import {
  getActiveSession,
  ActiveSessionResponse,
  WorkoutSession,
} from '@/src/lib/api/workoutSessions';
import {
  offlinePauseSession,
  offlineResumeSession,
  offlineFinishSession,
  offlineAbandonSession,
} from '@/src/lib/offline/offlineApi';
import {
  getActiveOfflineSessionId,
  getOfflineSession,
  persistSessionState,
} from '@/src/lib/offline/offlineStore';
import * as WorkoutNotification from '@/src/lib/workoutNotification';
import { useAuth } from '@/src/providers/AuthProvider';

// --- Timer context (changes every second — only subscribe if you need the live timer) ---

interface WorkoutTimerContextType {
  elapsedTime: number;
  formatTime: (seconds: number) => string;
}

const WorkoutTimerContext = createContext<WorkoutTimerContextType | undefined>(undefined);

// --- Main workout context (changes only on session state transitions) ---

interface WorkoutContextType {
  activeSession: WorkoutSession | null;
  loading: boolean;
  refreshActiveSession: () => Promise<void>;
  setActiveSession: (session: WorkoutSession | null) => void;
  pauseActiveSession: () => Promise<void>;
  resumeActiveSession: () => Promise<void>;
  finishActiveSession: () => Promise<void>;
  abandonActiveSession: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const notificationInitialized = useRef(false);
  const lastIosUpdate = useRef(0);

  // Initialize notification channel on mount
  useEffect(() => {
    if (!notificationInitialized.current) {
      notificationInitialized.current = true;
      WorkoutNotification.initialize();
    }
  }, []);

  const refreshActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      setElapsedTime(0);
      setLoading(false);
      return;
    }

    // Try API first if online
    if (isOnline) {
      try {
        const response: ActiveSessionResponse = await getActiveSession();
        if (response.active && response.session) {
          setActiveSession(response.session);
          // Persist for crash recovery
          persistSessionState(response.session, response.exercise_logs || []).catch(() => {});
        } else {
          // Check for offline-started session that hasn't synced yet
          const offlineId = await getActiveOfflineSessionId();
          if (offlineId) {
            const offlineSession = await getOfflineSession(offlineId);
            if (offlineSession && (offlineSession.status === 'in_progress' || offlineSession.status === 'paused')) {
              setActiveSession(offlineSession);
              setLoading(false);
              return;
            }
          }
          setActiveSession(null);
          setElapsedTime(0);
        }
        setLoading(false);
        return;
      } catch (error) {
        console.error('Failed to fetch active session', error);
        // On API failure, don't clear the active session — fall through to offline fallback
      }
    }

    // Offline fallback: check persisted offline session
    try {
      const offlineId = await getActiveOfflineSessionId();
      if (offlineId) {
        const offlineSession = await getOfflineSession(offlineId);
        if (offlineSession && (offlineSession.status === 'in_progress' || offlineSession.status === 'paused')) {
          setActiveSession(offlineSession);
        } else {
          setActiveSession(null);
          setElapsedTime(0);
        }
      } else {
        setActiveSession(null);
        setElapsedTime(0);
      }
    } catch {
      // Ignore offline store errors
    } finally {
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    refreshActiveSession();
  }, [refreshActiveSession]);

  // Auto-abandon after 12 hours
  const MAX_SESSION_SECONDS = 12 * 60 * 60;
  const autoAbandonTriggered = useRef(false);

  // Timer logic
  useEffect(() => {
    if (!activeSession) {
      setElapsedTime(0);
      autoAbandonTriggered.current = false;
      return;
    }

    const updateElapsed = () => {
      if (activeSession.status === 'paused') {
        setElapsedTime(activeSession.total_duration_sec);
        return;
      }

      const baseTime = activeSession.total_duration_sec;
      const lastResumed = new Date(activeSession.last_resumed_at || activeSession.started_at).getTime();
      const currentInterval = Math.floor((Date.now() - lastResumed) / 1000);
      const total = baseTime + currentInterval;
      setElapsedTime(total);

      // Auto-abandon if session exceeds 12 hours
      if (total >= MAX_SESSION_SECONDS && !autoAbandonTriggered.current) {
        autoAbandonTriggered.current = true;
        abandonActiveSessionInternal().catch((err) =>
          console.error('Auto-abandon after 12h failed', err)
        );
      }
    };

    updateElapsed();

    if (activeSession.status === 'paused') return;
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Poll for active session (skip when offline — no point hitting server)
  useEffect(() => {
    if (!user || !isOnline) return;
    const interval = setInterval(refreshActiveSession, 30000);
    return () => clearInterval(interval);
  }, [user, isOnline, refreshActiveSession]);

  // Notification lifecycle: show/dismiss based on activeSession
  useEffect(() => {
    if (activeSession) {
      const isPaused = activeSession.status === 'paused';
      WorkoutNotification.showActiveWorkout(elapsedTime, isPaused);
    } else {
      WorkoutNotification.dismiss();
    }
  }, [activeSession?.id, activeSession?.status]);

  // Update iOS notification periodically (Android uses native chronometer)
  useEffect(() => {
    if (!activeSession || activeSession.status === 'paused') return;

    const now = Date.now();
    if (now - lastIosUpdate.current >= 10000) {
      lastIosUpdate.current = now;
      WorkoutNotification.updateTimer(elapsedTime, false);
    }
  }, [elapsedTime, activeSession]);

  // Handle notification action presses (foreground)
  useEffect(() => {
    if (!activeSession) return;

    const unsubscribe = WorkoutNotification.onAction(async (action) => {
      switch (action) {
        case 'pause':
          await pauseActiveSessionInternal();
          break;
        case 'resume':
          await resumeActiveSessionInternal();
          break;
        case 'finish':
          await finishActiveSessionInternal();
          break;
      }
    });

    return unsubscribe;
  }, [activeSession?.id]);

  const pauseActiveSessionInternal = async () => {
    if (!activeSession) return;
    try {
      const updated = await offlinePauseSession(activeSession.id);
      setActiveSession(updated);
    } catch (error) {
      console.error('Failed to pause session', error);
      throw error;
    }
  };

  const resumeActiveSessionInternal = async () => {
    if (!activeSession) return;
    try {
      const updated = await offlineResumeSession(activeSession.id);
      setActiveSession(updated);
    } catch (error) {
      console.error('Failed to resume session', error);
      throw error;
    }
  };

  const finishActiveSessionInternal = async () => {
    if (!activeSession) return;
    try {
      await offlineFinishSession(activeSession.id);
      setActiveSession(null);
      await WorkoutNotification.dismiss();
    } catch (error) {
      console.error('Failed to finish session', error);
      throw error;
    }
  };

  const abandonActiveSessionInternal = async () => {
    if (!activeSession) return;
    try {
      await offlineAbandonSession(activeSession.id);
      setActiveSession(null);
      await WorkoutNotification.dismiss();
    } catch (error) {
      console.error('Failed to abandon session', error);
      throw error;
    }
  };

  const pauseActiveSession = useCallback(async () => {
    await pauseActiveSessionInternal();
  }, [activeSession?.id]);

  const resumeActiveSession = useCallback(async () => {
    await resumeActiveSessionInternal();
  }, [activeSession?.id]);

  const finishActiveSession = useCallback(async () => {
    await finishActiveSessionInternal();
  }, [activeSession?.id]);

  const abandonActiveSession = useCallback(async () => {
    await abandonActiveSessionInternal();
  }, [activeSession?.id]);

  // Main context value — only changes on session state transitions, NOT every second
  const value = useMemo(
    () => ({
      activeSession,
      loading,
      refreshActiveSession,
      setActiveSession,
      pauseActiveSession,
      resumeActiveSession,
      finishActiveSession,
      abandonActiveSession,
    }),
    [activeSession, loading, refreshActiveSession, pauseActiveSession, resumeActiveSession, finishActiveSession, abandonActiveSession]
  );

  // Timer context value — changes every second, only consumed by components that display the timer
  const timerValue = useMemo(
    () => ({ elapsedTime, formatTime }),
    [elapsedTime]
  );

  return (
    <WorkoutContext.Provider value={value}>
      <WorkoutTimerContext.Provider value={timerValue}>
        {children}
      </WorkoutTimerContext.Provider>
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within WorkoutProvider');
  }
  return context;
}

export function useWorkoutTimer() {
  const context = useContext(WorkoutTimerContext);
  if (!context) {
    throw new Error('useWorkoutTimer must be used within WorkoutProvider');
  }
  return context;
}
