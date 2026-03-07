import { Button } from '@/src/components/ui/Button';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { deleteSession, getSessionsHistory, WorkoutSession } from '@/src/lib/api/workoutSessions';
import { useRouter } from 'expo-router';
import { Calendar, ChevronDown, ChevronUp, Clock, Dumbbell, Hash, History, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const NEON_LIME = '#80f20d';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

interface ExerciseSummary {
  exercise_uuid: string;
  exercise_name: string;
  sets: number;
  total_reps: number;
  max_weight_kg: number | null;
}

interface EnrichedSession extends WorkoutSession {
  plan_name?: string;
  exercise_count?: number;
  total_sets?: number;
  total_volume_kg?: number;
  exercises?: ExerciseSummary[];
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}H ${minutes}M`;
  return `${minutes}M`;
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const palette = useThemeColors();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const hideConfirm = () => setConfirmConfig((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getSessionsHistory(page, 10);
      setSessions((response.data || []) as EnrichedSession[]);
      setTotalPages(response.meta?.total_pages || 1);
    } catch (loadError) {
      console.error('Failed to load history', loadError);
      setError('Failed to load workout history.');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteSession = (session: EnrichedSession) => {
    setConfirmConfig({
      visible: true,
      title: 'DELETE WORKOUT',
      message: `Delete ${session.plan_name || 'this workout'}? This will permanentely remove all logs for this session.`,
      onConfirm: async () => {
        hideConfirm();
        try {
          await deleteSession(session.id);
          setSessions((prev) => prev.filter((item) => item.id !== session.id));
        } catch (deleteError) {
          console.error('Failed to delete session', deleteError);
          setError('Failed to delete workout.');
        }
      },
    });
  };

  const renderSessionCard = (session: EnrichedSession) => {
    const isExpanded = expandedSessionId === session.id;
    const date = new Date(session.completed_at || session.workout_date || session.created_at);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    return (
      <View key={session.id} style={styles.sessionCard}>
        <Pressable
          onPress={() => setExpandedSessionId(isExpanded ? null : session.id)}
          style={styles.cardHeader}
        >
          <View style={styles.cardInfo}>
            <Text style={styles.planTitle}>{session.plan_name?.toUpperCase() || 'CUSTOM SESSION'}</Text>
            <View style={styles.dateRow}>
              <Calendar size={12} color="rgba(255,255,255,0.4)" />
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => onDeleteSession(session)}
            style={styles.deleteBtn}
          >
            <Trash2 size={18} color="#EF4444" />
          </Pressable>
        </Pressable>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Clock size={16} color={NEON_LIME} />
            <Text style={styles.statValue}>{formatDuration(session.total_duration_sec || 0)}</Text>
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <View style={styles.divisor} />
          <View style={styles.statItem}>
            <Dumbbell size={16} color={NEON_LIME} />
            <Text style={styles.statValue}>{session.exercise_count || 0}</Text>
            <Text style={styles.statLabel}>EXERCISES</Text>
          </View>
          <View style={styles.divisor} />
          <View style={styles.statItem}>
            <Hash size={16} color={NEON_LIME} />
            <Text style={styles.statValue}>{session.total_sets || 0}</Text>
            <Text style={styles.statLabel}>SETS</Text>
          </View>
        </View>

        {/* Glowing Progress Indicator */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: '100%' }]} />
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {session.exercises?.length ? (
              session.exercises.map((ex, idx) => (
                <View key={ex.exercise_uuid} style={[
                  styles.exerciseRow,
                  idx === (session.exercises?.length || 0) - 1 && { borderBottomWidth: 0 }
                ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{ex.exercise_name}</Text>
                    <Text style={styles.exMeta}>{ex.sets} SETS • {ex.total_reps} REPS</Text>
                  </View>
                  {ex.max_weight_kg != null && (
                    <View style={styles.weightBadge}>
                      <Text style={styles.weightText}>{ex.max_weight_kg}</Text>
                      <Text style={styles.unitText}>KG</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No exercise logs found for this session.</Text>
            )}
          </View>
        )}

        <Pressable
          onPress={() => setExpandedSessionId(isExpanded ? null : session.id)}
          style={styles.expandToggle}
        >
          {isExpanded ? (
            <ChevronUp size={20} color="rgba(255,255,255,0.3)" />
          ) : (
            <ChevronDown size={20} color="rgba(255,255,255,0.3)" />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Screen style={{ backgroundColor: DEPTH_BG }}>
      <PageHeader
        title="WORKOUT HISTORY"
        subtitle="Track your progress over time"
        backTo="/dashboard"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && sessions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={NEON_LIME} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <History size={48} color="rgba(255,255,255,0.1)" />
            </View>
            <Text style={styles.emptyTitle}>NO WORKOUTS YET</Text>
            <Text style={styles.emptySub}>Your fitness journey starts with the first rep.</Text>
            <Button
              title="START WORKOUT"
              onPress={() => router.push('/workouts/select')}
              style={styles.startBtn}
            />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sessions.map(renderSessionCard)}

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={[styles.pageBtn, page === 1 && { opacity: 0.3 }]}
                >
                  <Text style={styles.pageBtnText}>PREV</Text>
                </Pressable>
                <View style={styles.pageIndicator}>
                  <Text style={styles.currentPage}>{page}</Text>
                  <Text style={styles.totalPage}>/ {totalPages}</Text>
                </View>
                <Pressable
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={[styles.pageBtn, page === totalPages && { opacity: 0.3 }]}
                >
                  <Text style={styles.pageBtnText}>NEXT</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmConfig.visible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={hideConfirm}
        variant="danger"
        confirmLabel="DELETE"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 100,
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    gap: 16,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptySub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  startBtn: {
    marginTop: 12,
    minWidth: 200,
  },
  listContainer: {
    gap: 16,
  },
  sessionCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  planTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    color: NEON_LIME,
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  divisor: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: NEON_LIME,
    shadowColor: NEON_LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  expandedContent: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    padding: 20,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  exName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
  },
  exMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: 'rgba(128, 242, 13, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.1)',
  },
  weightText: {
    color: NEON_LIME,
    fontSize: 14,
    fontWeight: '900',
  },
  unitText: {
    color: NEON_LIME,
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.6,
  },
  expandToggle: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  pageBtn: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currentPage: {
    color: NEON_LIME,
    fontSize: 16,
    fontWeight: '900',
  },
  totalPage: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    fontWeight: '700',
  },
});
