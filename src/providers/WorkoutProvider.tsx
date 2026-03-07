import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getActiveSession, ActiveSessionResponse, WorkoutSession } from '@/src/lib/api/workoutSessions';
import { useAuth } from '@/src/providers/AuthProvider';

interface WorkoutContextType {
  activeSession: WorkoutSession | null;
  elapsedTime: number;
  loading: boolean;
  refreshActiveSession: () => Promise<void>;
  setActiveSession: (session: WorkoutSession | null) => void;
  formatTime: (seconds: number) => string;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

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

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshActiveSession, 30000);
    return () => clearInterval(interval);
  }, [user, refreshActiveSession]);

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
    }),
    [activeSession, elapsedTime, loading, refreshActiveSession]
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
