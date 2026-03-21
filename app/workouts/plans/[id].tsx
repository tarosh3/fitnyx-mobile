import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkout } from '@/src/providers/WorkoutProvider';
import {
  getDayExercises,
  getPlanDays,
  getWorkoutPlan,
  WorkoutDayExercise,
  WorkoutPlan,
  WorkoutPlanDay,
} from '@/src/lib/api/workoutPlans';
import { offlineStartSession } from '@/src/lib/offline/offlineApi';
import {
  cacheDayExercises,
  cachePlan,
  cachePlanDays,
  getCachedDayExercises,
  getCachedPlan,
  getCachedPlanDays,
} from '@/src/lib/db';
import {
  Calendar,
  ChevronDown,
  Clock,
  Layout,
  Play,
  Zap
} from 'lucide-react-native';

const NEON_LIME = '#5fc793';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

interface DayWithExercises extends WorkoutPlanDay {
  exercises: WorkoutDayExercise[];
}

function formatDate(dateString?: string) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PlanDetailsScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [days, setDays] = useState<DayWithExercises[]>([]);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [loadingDayId, setLoadingDayId] = useState<string | null>(null);
  const [startingDayId, setStartingDayId] = useState<string | null>(null);
  const { isOffline } = useOfflineAware();
  const { activeSession } = useWorkout();

  useEffect(() => {
    if (!planId) return;
    loadPlan();
  }, [planId, isOffline]);

  const loadPlan = async () => {
    if (!planId) return;

    setLoading(true);
    setError(null);
    let loadedCached = false;

    try {
      const [cachedPlan, cachedDays] = await Promise.all([getCachedPlan(planId), getCachedPlanDays(planId)]);
      if (cachedPlan && cachedDays) {
        setPlan(cachedPlan);
        setDays(cachedDays.map((day) => ({ ...day, exercises: [] })));
        loadedCached = true;
        setLoading(false);
      }

      // If offline and we have cache, skip API calls entirely
      if (isOffline && loadedCached) return;

      const [planResult, daysResult] = await Promise.all([getWorkoutPlan(planId), getPlanDays(planId)]);
      setPlan(planResult);
      const hydratedDays = (daysResult.data || []).map((day) => ({ ...day, exercises: [] }));
      setDays(hydratedDays);

      await Promise.all([cachePlan(planResult), cachePlanDays(planId, daysResult.data || [])]);
    } catch (loadError: any) {
      console.error('Failed to load plan details', loadError);
      if (!loadedCached) {
        setError('Failed to load plan details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = async (day: DayWithExercises) => {
    if (expandedDayId === day.id) {
      setExpandedDayId(null);
      return;
    }

    setExpandedDayId(day.id);
    if (day.is_rest_day || day.exercises.length > 0) {
      return;
    }

    setLoadingDayId(day.id);

    try {
      const cached = await getCachedDayExercises(day.id);
      if (cached) {
        setDays((prev) => prev.map((entry) => (entry.id === day.id ? { ...entry, exercises: cached } : entry)));
        // If offline, stop here — don't try API
        if (isOffline) {
          setLoadingDayId(null);
          return;
        }
      }

      const response = await getDayExercises(day.id);
      const exercises = response.data || [];
      setDays((prev) => prev.map((entry) => (entry.id === day.id ? { ...entry, exercises } : entry)));
      await cacheDayExercises(day.id, exercises);
    } catch (toggleError) {
      console.error('Failed to load day exercises', toggleError);
    } finally {
      setLoadingDayId(null);
    }
  };

  const startDayWorkout = async (dayId: string) => {
    if (!planId) return;

    setStartingDayId(dayId);
    setError(null);

    try {
      const session = await offlineStartSession({
        workout_plan_id: planId,
        workout_day_id: dayId,
      });
      router.push(`/workouts/session/${session.id}`);
    } catch (startError: any) {
      if (startError?.status === 409 && startError?.data?.session_id) {
        router.push(`/workouts/session/${startError.data.session_id}`);
        return;
      }

      console.error('Failed to start session', startError);
      setError(startError?.message || 'Failed to start workout.');
    } finally {
      setStartingDayId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: DEPTH_BG, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={NEON_LIME} />
      </View>
    );
  }

  if (!plan) {
    return (
      <Screen style={{ backgroundColor: DEPTH_BG }}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>PLAN NOT FOUND</Text>
          <Pressable onPress={() => router.replace('/workouts/select')} style={styles.backBtnAction}>
            <Text style={styles.backBtnActionText}>BACK TO PLANS</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: DEPTH_BG }}>
      <PageHeader
        title={plan.title.toUpperCase()}
        subtitle="WORKOUT PLAN DETAILS"
        backTo="/workouts/select"
      />

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>OFFLINE MODE</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.metaCard}>
        <View style={styles.metaHeader}>
          <View style={styles.metaBadge}>
            <Layout size={12} color={NEON_LIME} />
            <Text style={styles.metaBadgeText}>{plan.goal ? plan.goal.replace('_', ' ').toUpperCase() : 'FITNESS'}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Calendar size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.metaBadgeText}>{days.length} DAYS</Text>
          </View>
        </View>

        {plan.description ? <Text style={styles.planDesc}>{plan.description}</Text> : null}

        <View style={styles.metaStrip}>
          <View style={styles.metaItem}>
            <Clock size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.metaItemText}>START: {formatDate(plan.start_date).toUpperCase()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Zap size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.metaItemText}>SOURCE: {plan.source.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.daysList}>
        <Text style={styles.sectionTitle}>TRAINING DAYS</Text>
        {days.length === 0 ? (
          <View style={styles.emptyDaysCard}>
            <Text style={styles.emptyDaysText}>No training days configured yet.</Text>
          </View>
        ) : (
          days
            .slice()
            .sort((a, b) => a.day_index - b.day_index)
            .map((day, index) => {
              const expanded = expandedDayId === day.id;
              const loadingExercises = loadingDayId === day.id;
              const isRest = day.is_rest_day;

              return (
                <View
                  key={day.id}
                  style={[
                    styles.dayCard,
                    expanded && styles.dayCardExpanded,
                    isRest && styles.dayCardRest
                  ]}
                >
                  <Pressable onPress={() => toggleDay(day)} style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <View style={[styles.dayNumber, expanded && { backgroundColor: NEON_LIME }]}>
                        <Text style={[styles.dayNumberText, expanded && { color: '#000' }]}>{index + 1}</Text>
                      </View>
                      <View>
                        <Text style={[styles.dayTitle, expanded && { color: '#fff' }]}>
                          {day.title || 'WORKOUT SESSION'}
                        </Text>
                        {day.notes ? (
                          <Text style={styles.dayNotes} numberOfLines={1}>{day.notes}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.dayHeaderRight}>
                      {isRest ? (
                        <View style={styles.restBadge}>
                          <Text style={styles.restBadgeText}>REST</Text>
                        </View>
                      ) : (
                        <ChevronDown
                          size={20}
                          color="rgba(255,255,255,0.3)"
                          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                        />
                      )}
                    </View>
                  </Pressable>

                  {expanded && !isRest && (
                    <View style={styles.dayContent}>
                      {loadingExercises ? (
                        <View style={styles.exercisesLoader}>
                          <ActivityIndicator color={NEON_LIME} />
                        </View>
                      ) : day.exercises.length > 0 ? (
                        <View style={styles.exercisesList}>
                          {day.exercises.map((exercise, exIdx) => (
                            <View key={exercise.id} style={styles.exerciseItem}>
                              <View style={styles.exerciseIndex}>
                                <Text style={styles.exIndexText}>{exIdx + 1}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.exerciseName}>
                                  {exercise.exercise?.title?.toUpperCase() || `EXERCISE ${exIdx + 1}`}
                                </Text>
                                <View style={styles.exerciseMeta}>
                                  <Text style={styles.exMetaText}>
                                    {exercise.target_sets || '-'} SETS × {exercise.target_reps || '-'} REPS
                                  </Text>
                                  {exercise.target_weight_kg ? (
                                    <>
                                      <View style={styles.metaDot} />
                                      <Text style={[styles.exMetaText, { color: NEON_LIME }]}>
                                        {exercise.target_weight_kg} KG
                                      </Text>
                                    </>
                                  ) : null}
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noExercisesText}>No exercises added for this day.</Text>
                      )}

                      {activeSession && activeSession.day_id === day.id ? (
                        <Pressable
                          onPress={() => router.push(`/workouts/session/${activeSession.id}`)}
                          style={({ pressed }) => [
                            styles.startBtn,
                            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                          ]}
                        >
                          <Play size={18} color="#000" fill="#000" />
                          <Text style={styles.startBtnText}>CONTINUE WORKOUT</Text>
                        </Pressable>
                      ) : activeSession ? (
                        <View style={[styles.startBtn, { opacity: 0.4 }]}>
                          <Text style={styles.startBtnText}>SESSION ALREADY ACTIVE</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => startDayWorkout(day.id)}
                          disabled={startingDayId === day.id}
                          style={({ pressed }) => [
                            styles.startBtn,
                            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                          ]}
                        >
                          {startingDayId === day.id ? (
                            <ActivityIndicator color="#000" />
                          ) : (
                            <>
                              <Play size={18} color="#000" fill="#000" />
                              <Text style={styles.startBtnText}>START WORKOUT</Text>
                            </>
                          )}
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  metaHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  metaBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 20,
  },
  metaStrip: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItemText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  daysList: {
    gap: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
    paddingLeft: 4,
  },
  emptyDaysCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyDaysText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontWeight: '600',
  },
  dayCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  dayCardExpanded: {
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dayCardRest: {
    opacity: 0.6,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dayNumberText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '900',
  },
  dayTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dayNotes: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restBadge: {
    backgroundColor: 'rgba(128, 242, 13, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.2)',
  },
  restBadgeText: {
    color: NEON_LIME,
    fontSize: 9,
    fontWeight: '900',
  },
  dayContent: {
    padding: 16,
    paddingTop: 0,
    gap: 20,
  },
  exercisesLoader: {
    paddingVertical: 20,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  exerciseIndex: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIndexText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '900',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  exMetaText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  noExercisesText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
  startBtn: {
    backgroundColor: NEON_LIME,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  startBtnText: {
    color: DEPTH_BG,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
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
  offlineBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
