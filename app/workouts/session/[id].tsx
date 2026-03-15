import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { ExerciseDetailModal } from '@/src/features/dashboard/ExerciseDetailModal';
import { ExerciseMedia } from '@/src/features/workouts/ExerciseMedia';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getDayExercises, WorkoutDayExercise } from '@/src/lib/api/workoutPlans';
import {
  ExerciseLog,
  WorkoutSession,
} from '@/src/lib/api/workoutSessions';
import {
  offlineGetSession,
  offlineLogSet,
  offlineUpdateLog,
  offlineDeleteLog,
} from '@/src/lib/offline/offlineApi';
import { fetchExerciseWithCache, cacheExercisesForDay } from '@/src/lib/offline/exerciseCache';
import { cacheWorkoutVideos } from '@/src/lib/offline/videoCache';
import { getCachedDayExercises } from '@/src/lib/db';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import { Exercise, RelatedExercise } from '@/src/types/exercise';
import {
  CheckCircle2,
  ChevronLeft,
  Dumbbell,
  Edit3,
  Info,
  Pause,
  Play,
  Plus,
  Trash2,
  XCircle
} from 'lucide-react-native';

const NEON_LIME = '#5fc793';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

interface ExerciseWithLogs {
  exercise: WorkoutDayExercise;
  exerciseDetails: Exercise | null;
  logs: ExerciseLog[];
}

function kgToLbs(value: number) {
  return value * 2.20462;
}

function lbsToKg(value: number) {
  return value / 2.20462;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function pickExerciseMedia(exercise: Exercise | null): string | undefined {
  if (!exercise) return undefined;
  return exercise.variations?.[0]?.image || exercise.primary_muscles?.[0]?.image || exercise.video_url || undefined;
}

// Isolated timer component — re-renders every second without affecting the parent
function SessionTimer({ session, onPauseResume, onFinish, onAbandon, finishing }: {
  session: WorkoutSession;
  onPauseResume: () => void;
  onFinish: () => void;
  onAbandon: () => void;
  finishing: boolean;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      if (session.status === 'paused') {
        setElapsedTime(session.total_duration_sec);
        return;
      }

      const base = session.total_duration_sec;
      const since = new Date(session.last_resumed_at || session.started_at).getTime();
      const currentInterval = Math.max(0, Math.floor((Date.now() - since) / 1000));
      setElapsedTime(base + currentInterval);
    };

    updateElapsed();
    if (session.status === 'paused') return;

    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <View style={styles.timerCard}>
      <View style={styles.timerContent}>
        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        <Text style={styles.timerLabel}>TOTAL ELAPSED TIME</Text>
      </View>

      <View style={styles.timerActions}>
        <Pressable onPress={onPauseResume} style={styles.timerActionBtn}>
          {session.status === 'paused' ? (
            <Play size={20} color={NEON_LIME} fill={NEON_LIME} />
          ) : (
            <Pause size={20} color="#fff" fill="#fff" />
          )}
          <Text style={[styles.timerActionText, session.status === 'paused' && { color: NEON_LIME }]}>
            {session.status === 'paused' ? 'RESUME' : 'PAUSE'}
          </Text>
        </Pressable>

        <Pressable onPress={onFinish} disabled={finishing} style={styles.timerActionBtnFinish}>
          {finishing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#000" />
              <Text style={styles.timerActionTextFinish}>FINISH</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={onAbandon} style={styles.timerActionBtnAbandon}>
          <XCircle size={20} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </View>
    </View>
  );
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;
  const { setActiveSession, pauseActiveSession, resumeActiveSession, finishActiveSession, abandonActiveSession } = useWorkout();
  const { isOffline, pendingCount } = useOfflineAware();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithLogs[]>([]);

  const [activeExerciseUuid, setActiveExerciseUuid] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('0');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  const sanitizeReps = (text: string) => text.replace(/[^0-9]/g, '').slice(0, 3);

  const sanitizeWeight = (text: string) => {
    const digits = text.replace(/[^0-9.]/g, '');
    const parts = digits.split('.');
    const whole = parts[0].slice(0, 3);
    if (parts.length > 1) {
      return whole + '.' + parts.slice(1).join('').slice(0, 1);
    }
    return whole;
  };

  const [submittingSet, setSubmittingSet] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    showCancel?: boolean;
    confirmLabel?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'primary',
    showCancel: true,
  });

  const hideConfirm = () => setConfirmConfig((prev) => ({ ...prev, visible: false }));

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Reload when coming back online (exercises may have failed to load while offline)
  const [wasOffline, setWasOffline] = useState(false);
  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setWasOffline(false);
      // Re-load session data now that we're online
      if (sessionId) loadSession();
    }
  }, [isOffline]);

  useEffect(() => {
    if (!sessionId) return;
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await offlineGetSession(sessionId);
      setSession(response.session);
      setActiveSession(response.session);

      if (!response.session.day_id) {
        setExercises([]);
        return;
      }

      // Try API first, fall back to cache for day exercises
      let dayExerciseList: WorkoutDayExercise[] = [];
      try {
        const dayExercises = await getDayExercises(response.session.day_id);
        dayExerciseList = dayExercises.data || [];
      } catch {
        // Fallback to cached day exercises
        const cached = await getCachedDayExercises(response.session.day_id);
        dayExerciseList = cached || [];
      }

      const byExercise = new Map<string, ExerciseLog[]>();
      (response.exercise_logs || []).forEach((log) => {
        if (!byExercise.has(log.exercise_uuid)) {
          byExercise.set(log.exercise_uuid, []);
        }
        byExercise.get(log.exercise_uuid)?.push(log);
      });

      const merged: ExerciseWithLogs[] = await Promise.all(
        dayExerciseList.map(async (planned) => {
          const details = await fetchExerciseWithCache(planned.exercise_uuid);
          return {
            exercise: planned,
            exerciseDetails: details,
            logs: byExercise.get(planned.exercise_uuid) || [],
          };
        })
      );

      setExercises(merged);

      // Cache exercise data and videos for offline use (only when online)
      if (!isOffline) {
        const uuids = dayExerciseList.map((e) => e.exercise_uuid);
        cacheExercisesForDay(uuids).catch(() => {});

        const videoUrls = merged
          .map((e) => e.exerciseDetails?.video_url)
          .filter((url): url is string => Boolean(url))
          .filter((url) => url.endsWith('.mp4'));
        if (videoUrls.length > 0) {
          cacheWorkoutVideos(videoUrls).catch(() => {});
        }
      }
    } catch (loadError: any) {
      console.error('Failed to load workout session', loadError);
      setError(loadError?.message || 'Failed to load workout session.');
    } finally {
      setLoading(false);
    }
  };

  const openAddSet = (exerciseUuid: string, log?: ExerciseLog) => {
    setActiveExerciseUuid(exerciseUuid);

    if (log) {
      setEditingLogId(log.id);
      setReps(String(log.reps));
      const logWeight = log.weight_kg || 0;
      setWeight(String(weightUnit === 'kg' ? logWeight : Number(kgToLbs(logWeight).toFixed(1))));
    } else {
      setEditingLogId(null);
      setReps('10');
      setWeight('0');
    }
  };

  const closeSetEditor = () => {
    setActiveExerciseUuid(null);
    setEditingLogId(null);
    setReps('10');
    setWeight('0');
  };

  const submitSet = async (exerciseUuid: string) => {
    if (!sessionId) return;

    const repsNumber = Number(reps);
    const weightNumber = Number(weight);

    if (!Number.isFinite(repsNumber) || repsNumber <= 0) {
      setConfirmConfig({
        visible: true,
        title: 'Invalid Reps',
        message: 'Please enter a valid reps value.',
        onConfirm: hideConfirm,
        showCancel: false,
        confirmLabel: 'OK',
      });
      return;
    }

    const weightKg = Number.isFinite(weightNumber) && weightNumber > 0
      ? weightUnit === 'kg'
        ? weightNumber
        : lbsToKg(weightNumber)
      : undefined;

    setSubmittingSet(true);
    setError(null);

    try {
      if (editingLogId) {
        const updated = await offlineUpdateLog(sessionId, editingLogId, {
          actual_reps: repsNumber,
          actual_weight_kg: weightKg,
        });

        setExercises((prev) =>
          prev.map((entry) =>
            entry.exercise.exercise_uuid === exerciseUuid
              ? {
                ...entry,
                logs: entry.logs.map((log) => (log.id === editingLogId ? { ...log, ...updated } : log)),
              }
              : entry
          )
        );
      } else {
        const currentLogs = exercises.find((entry) => entry.exercise.exercise_uuid === exerciseUuid)?.logs || [];
        const setNumber = currentLogs.length + 1;

        const created = await offlineLogSet(sessionId, {
          exercise_uuid: exerciseUuid,
          set_number: setNumber,
          actual_reps: repsNumber,
          actual_weight_kg: weightKg,
          actual_rest_seconds: 0,
        });

        setExercises((prev) =>
          prev.map((entry) =>
            entry.exercise.exercise_uuid === exerciseUuid
              ? {
                ...entry,
                logs: [...entry.logs, created],
              }
              : entry
          )
        );
      }

      closeSetEditor();
    } catch (submitError: any) {
      console.error('Failed to log set', submitError);
      setError(submitError?.message || 'Failed to log set.');
    } finally {
      setSubmittingSet(false);
    }
  };

  const removeLog = (logId: string) => {
    setConfirmConfig({
      visible: true,
      title: 'DELETE SET',
      message: 'Delete this logged set?',
      variant: 'danger',
      confirmLabel: 'DELETE',
      onConfirm: async () => {
        hideConfirm();
        try {
          await offlineDeleteLog(sessionId, logId);
          setExercises((prev) =>
            prev.map((entry) => ({
              ...entry,
              logs: entry.logs.filter((log) => log.id !== logId),
            }))
          );
        } catch (deleteError) {
          console.error('Failed to delete log', deleteError);
          setError('Failed to delete log.');
        }
      },
    });
  };

  const pauseOrResume = useCallback(async () => {
    if (!sessionId || !session) return;

    try {
      if (session.status === 'paused') {
        await resumeActiveSession();
      } else {
        await pauseActiveSession();
      }
      // Refresh local session state
      const response = await offlineGetSession(sessionId);
      setSession(response.session);
    } catch (actionError) {
      console.error('Failed to update pause state', actionError);
      setError('Failed to update session state.');
    }
  }, [sessionId, session?.status]);

  const completeWorkout = useCallback(async () => {
    if (!sessionId) return;

    setFinishing(true);
    setError(null);

    try {
      await finishActiveSession();
      router.replace('/workouts/select');
    } catch (finishError) {
      console.error('Failed to finish workout', finishError);
      setError('Failed to finish workout.');
    } finally {
      setFinishing(false);
    }
  }, [sessionId]);

  const abandonWorkout = useCallback(() => {
    if (!sessionId) return;

    setConfirmConfig({
      visible: true,
      title: 'ABANDON WORKOUT',
      message: 'Logged sets will remain saved, but this session will be marked abandoned.',
      variant: 'danger',
      confirmLabel: 'ABANDON',
      onConfirm: async () => {
        hideConfirm();
        try {
          await abandonActiveSession();
          router.replace('/workouts/select');
        } catch (abandonError) {
          console.error('Failed to abandon', abandonError);
          setError('Failed to abandon workout.');
        }
      },
    });
  }, [sessionId]);

  const onSelectRelated = async (exercise: RelatedExercise) => {
    try {
      const details = await fetchExerciseWithCache(exercise.uuid);
      if (details) setSelectedExercise(details);
    } catch {
      // keep current details
    }
  };

  const statusLabel = useMemo(() => {
    if (!session) return 'Loading';
    if (session.status === 'paused') return 'Paused';
    if (session.status === 'completed') return 'Completed';
    if (session.status === 'abandoned') return 'Abandoned';
    return 'In Progress';
  }, [session]);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: DEPTH_BG, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={NEON_LIME} />
      </View>
    );
  }

  if (!session) {
    return (
      <Screen style={{ backgroundColor: DEPTH_BG }}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>SESSION NOT FOUND</Text>
          <Pressable onPress={() => router.replace('/workouts/select')} style={styles.backBtnAction}>
            <Text style={styles.backBtnActionText}>BACK TO PLANS</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: DEPTH_BG }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} style={styles.backBtn}>
          <ChevronLeft size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>ACTIVE WORKOUT</Text>
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusDot, { backgroundColor: session.status === 'paused' ? '#FFA500' : NEON_LIME }]} />
            <Text style={styles.headerSubtitle}>{statusLabel.toUpperCase()}</Text>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>OFFLINE</Text>
              </View>
            )}
            {!isOffline && pendingCount > 0 && (
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeText}>SYNCING {pendingCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <SessionTimer
        session={session}
        onPauseResume={pauseOrResume}
        onFinish={completeWorkout}
        onAbandon={abandonWorkout}
        finishing={finishing}
      />

      <View style={styles.exercisesList}>
        {exercises.map((entry, index) => {
          const exerciseUuid = entry.exercise.exercise_uuid;
          const editingThis = activeExerciseUuid === exerciseUuid;
          const media = pickExerciseMedia(entry.exerciseDetails);

          return (
            <View key={entry.exercise.id} style={styles.exerciseCard}>
              <View style={styles.exHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exTitle}>
                    {index + 1}. {entry.exerciseDetails?.title?.toUpperCase() || entry.exercise.exercise?.title?.toUpperCase() || 'EXERCISE'}
                  </Text>
                  <View style={styles.exMetaRow}>
                    <Text style={styles.exMetaText}>
                      TARGET: {entry.exercise.target_sets || '-'} SETS × {entry.exercise.target_reps || '-'} REPS
                    </Text>
                    {entry.exercise.target_weight_kg ? (
                      <Text style={[styles.exMetaText, { color: NEON_LIME }]}>
                        {' '}@ {entry.exercise.target_weight_kg}KG
                      </Text>
                    ) : null}
                  </View>
                </View>

                {entry.exerciseDetails ? (
                  <Pressable
                    onPress={() => {
                      setSelectedExercise(entry.exerciseDetails);
                      setInfoOpen(true);
                    }}
                    style={styles.infoBtn}
                  >
                    <Info size={16} color={NEON_LIME} />
                  </Pressable>
                ) : null}
              </View>

              {media ? <ExerciseMedia url={media} title={entry.exerciseDetails?.title || 'Exercise'} style={styles.media} /> : null}

              <View style={styles.logsList}>
                {entry.logs.length === 0 ? (
                  <View style={styles.emptyLogs}>
                    <Dumbbell size={16} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyLogsText}>NO SETS LOGGED YET</Text>
                  </View>
                ) : (
                  entry.logs.map((log) => {
                    const displayWeight = log.weight_kg
                      ? weightUnit === 'kg'
                        ? `${log.weight_kg.toFixed(1)} KG`
                        : `${kgToLbs(log.weight_kg).toFixed(1)} LBS`
                      : '--';

                    return (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logIndex}>
                          <Text style={styles.logIndexText}>SET {log.set_index}</Text>
                        </View>
                        <View style={styles.logDetails}>
                          <Text style={styles.logMainText}>{log.reps} REPS</Text>
                          <View style={styles.metaDot} />
                          <Text style={styles.logSubText}>{displayWeight}</Text>
                        </View>
                        <View style={styles.logActions}>
                          <Pressable onPress={() => openAddSet(exerciseUuid, log)} style={styles.logActionBtn}>
                            <Edit3 size={14} color="rgba(255,255,255,0.4)" />
                          </Pressable>
                          <Pressable onPress={() => removeLog(log.id)} style={styles.logActionBtn}>
                            <Trash2 size={14} color="rgba(239, 68, 68, 0.4)" />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {editingThis ? (
                <View style={styles.editorBox}>
                  <View style={styles.editorFields}>
                    <View style={styles.fieldItemReps}>
                      <Text style={styles.fieldLabel}>REPS</Text>
                      <Input
                        value={reps}
                        onChangeText={setReps}
                        sanitize={sanitizeReps}
                        keyboardType="number-pad"
                        maxLength={3}
                        style={styles.editorInput}
                      />
                    </View>
                    <View style={styles.fieldItemWeight}>
                      <Text style={styles.fieldLabel}>WEIGHT ({weightUnit.toUpperCase()})</Text>
                      <View style={styles.weightInputRow}>
                        <Input
                          value={weight}
                          onChangeText={setWeight}
                          sanitize={sanitizeWeight}
                          keyboardType="decimal-pad"
                          maxLength={5}
                          containerStyle={{ flex: 1, minWidth: 0 }}
                          style={styles.editorInput}
                        />
                        <Pressable
                          onPress={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
                          style={styles.unitSwitch}
                        >
                          <Text style={styles.unitSwitchText}>{weightUnit.toUpperCase()}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View style={styles.editorActions}>
                    <Pressable
                      onPress={() => submitSet(exerciseUuid)}
                      disabled={submittingSet}
                      style={styles.submitSetBtn}
                    >
                      {submittingSet ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={styles.submitSetBtnText}>
                          {editingLogId ? 'UPDATE SESSION DATA' : 'CONFIRM SET'}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable onPress={closeSetEditor} style={styles.cancelSetBtn}>
                      <Text style={styles.cancelSetBtnText}>CANCEL</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => openAddSet(exerciseUuid)} style={styles.addSetBtn}>
                  <Plus size={16} color={NEON_LIME} />
                  <Text style={styles.addSetBtnText}>LOG NEW SET</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <ExerciseDetailModal
        exercise={selectedExercise}
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        onSelectExercise={onSelectRelated}
      />

      <ConfirmModal
        visible={confirmConfig.visible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={hideConfirm}
        variant={confirmConfig.variant}
        showCancel={confirmConfig.showCancel}
        confirmLabel={confirmConfig.confirmLabel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingTop: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    gap: 20,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerText: {
    color: NEON_LIME,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  timerLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -4,
  },
  timerActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  timerActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerActionBtnFinish: {
    flex: 1.2,
    backgroundColor: NEON_LIME,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  timerActionTextFinish: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerActionBtnAbandon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  exercisesList: {
    gap: 20,
    paddingBottom: 40,
  },
  exerciseCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    gap: 16,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  exTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  exMetaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  exMetaText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
  },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 242, 13, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.1)',
  },
  media: {
    borderRadius: 16,
    height: 200,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  logsList: {
    gap: 10,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logIndex: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logIndexText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '900',
  },
  logDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
  },
  logMainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logSubText: {
    color: NEON_LIME,
    fontSize: 13,
    fontWeight: '700',
  },
  logActions: {
    flexDirection: 'row',
    gap: 8,
  },
  logActionBtn: {
    padding: 6,
  },
  emptyLogs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
  },
  emptyLogsText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  addSetBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.2)',
    backgroundColor: 'rgba(128, 242, 13, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addSetBtnText: {
    color: NEON_LIME,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  editorBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editorFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldItemReps: {
    flex: 2,
    gap: 8,
  },
  fieldItemWeight: {
    flex: 3,
    gap: 8,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  editorInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: BORDER_COLOR,
    color: '#fff',
    height: 48,
    fontSize: 16,
    fontWeight: '700',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitSwitch: {
    width: 44,
    minWidth: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unitSwitchText: {
    color: NEON_LIME,
    fontSize: 11,
    fontWeight: '900',
  },
  editorActions: {
    gap: 10,
  },
  submitSetBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: NEON_LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitSetBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelSetBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSetBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  backBtnAction: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backBtnActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  offlineBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  offlineBadgeText: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  syncBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  syncBadgeText: {
    color: '#FBBF24',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
