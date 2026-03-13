import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  getActiveSession,
  ActiveSessionResponse,
  WorkoutSession,
  pauseSession,
  resumeSession,
  finishSession,
  abandonSessionAction,
} from '@/src/lib/api/workoutSessions';
import * as WorkoutNotification from '@/src/lib/workoutNotification';
import { useAuth } from '@/src/providers/AuthProvider';

interface WorkoutContextType {
  activeSession: WorkoutSession | null;
  elapsedTime: number;
  loading: boolean;
  refreshActiveSession: () => Promise<void>;
  setActiveSession: (session: WorkoutSession | null) => void;
  formatTime: (seconds: number) => string;
  pauseActiveSession: () => Promise<void>;
  resumeActiveSession: () => Promise<void>;
  finishActiveSession: () => Promise<void>;
  abandonActiveSession: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

    try {
      const response: ActiveSessionResponse = await getActiveSession();
      if (response.active && response.session) {
        setActiveSession(response.session);
      } else {
        setActiveSession(null);
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Failed to fetch active session', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshActiveSession();
  }, [refreshActiveSession]);

  // Timer logic
  useEffect(() => {
    if (!activeSession) {
      setElapsedTime(0);
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
      setElapsedTime(baseTime + currentInterval);
    };

    updateElapsed();

    if (activeSession.status === 'paused') return;
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Poll for active session
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshActiveSession, 30000);
    return () => clearInterval(interval);
  }, [user, refreshActiveSession]);

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
      const updated = await pauseSession(activeSession.id);
      setActiveSession(updated);
    } catch (error) {
      console.error('Failed to pause session', error);
      throw error;
    }
  };

  const resumeActiveSessionInternal = async () => {
    if (!activeSession) return;
    try {
      const updated = await resumeSession(activeSession.id);
      setActiveSession(updated);
    } catch (error) {
      console.error('Failed to resume session', error);
      throw error;
    }
  };

  const finishActiveSessionInternal = async () => {
    if (!activeSession) return;
    try {
      await finishSession(activeSession.id);
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
      await abandonSessionAction(activeSession.id);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const value = useMemo(
    () => ({
      activeSession,
      elapsedTime,
      loading,
      refreshActiveSession,
      setActiveSession,
      formatTime,
      pauseActiveSession,
      resumeActiveSession,
      finishActiveSession,
      abandonActiveSession,
    }),
    [activeSession, elapsedTime, loading, refreshActiveSession, pauseActiveSession, resumeActiveSession, finishActiveSession, abandonActiveSession]
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within WorkoutProvider');
  }
  return context;
}
