import { useVideoPlayer, VideoView } from 'expo-video';
import { Lightbulb, TrendingUp, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { fetchExerciseHistory, type ExerciseHistory } from '@/src/lib/api/exercises';
import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheKeys, cacheTTL } from '@/src/lib/cache/keys';
import { Exercise, RelatedExercise } from '@/src/types/exercise';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: RelatedExercise) => void;
}

import { useThemeColors } from '@/src/hooks/useThemeColors';

const NEON_LIME = '#5fc793';

export function ExerciseDetailModal({ exercise, isOpen, onClose, onSelectExercise }: ExerciseDetailModalProps) {
  const palette = useThemeColors();
  const styles = getStyles(palette);
  const videoUrl = exercise?.video_url || (exercise?.media_url?.toLowerCase().endsWith('.mp4') ? exercise?.media_url : null);
  const imageUrl = exercise?.media_url && !exercise?.media_url.toLowerCase().endsWith('.mp4') ? exercise?.media_url : (exercise?.video_url ? null : exercise?.media_url);

  const player = useVideoPlayer(videoUrl || null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  if (!exercise) return null;

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>{exercise.title.toUpperCase()}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X color={palette.text} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.videoWrap}>
              {videoUrl ? (
                <VideoView
                  player={player}
                  style={styles.videoBg}
                  contentFit="cover"
                  nativeControls={false}
                />
              ) : imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.videoBg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoBg} />
              )}
            </View>

            {/* Your progress: history + chart */}
            <ExerciseProgress key={exercise.uuid} uuid={exercise.uuid} />

            {/* Pro Tip */}
            {exercise.pro_tip ? (
              <View style={styles.proTipCard}>
                <View style={styles.proTipHeader}>
                  <Lightbulb color={NEON_LIME} size={16} />
                  <Text style={styles.proTipTitle}>PRO TIP</Text>
                </View>
                <Text style={styles.proTipText}>{exercise.pro_tip}</Text>
              </View>
            ) : null}

            {/* Targeted Muscles */}
            {exercise.primary_muscles?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TARGETED MUSCLES</Text>
                <View style={styles.muscleTags}>
                  {exercise.primary_muscles.map((muscle) => (
                    <View key={muscle.name} style={styles.muscleTagPrimary}>
                      <Text style={styles.muscleTagLabelPrimary}>Primary:</Text>
                      <Text style={styles.muscleTagValuePrimary}>{muscle.name}</Text>
                      <View style={styles.dot} />
                    </View>
                  ))}
                  {exercise.secondary_muscles?.map((muscle) => (
                    <View key={muscle.name} style={styles.muscleTagSecondary}>
                      <Text style={styles.muscleTagLabelSecondary}>Secondary:</Text>
                      <Text style={styles.muscleTagValueSecondary}>{muscle.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INSTRUCTIONS</Text>
              <Text style={styles.instructionText}>
                {exercise.how_to || 'No detailed instructions available for this exercise. Focus on maintaining proper form and controlled movements.'}
              </Text>
            </View>

            {/* Variations */}
            {exercise.variations?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>VARIATIONS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizPills}>
                  {exercise.variations
                    .filter((variation) => variation.uuid !== exercise.uuid)
                    .map((variation) => (
                      <Pressable
                        key={variation.uuid}
                        onPress={() => onSelectExercise(variation)}
                        style={styles.pill}
                      >
                        <Text style={styles.pillText}>{variation.name}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Alternatives */}
            {exercise.alternatives?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ALTERNATIVES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizPills}>
                  {exercise.alternatives
                    .filter((alt) => alt.uuid !== exercise.uuid)
                    .map((alt) => (
                      <Pressable
                        key={alt.uuid}
                        onPress={() => onSelectExercise(alt)}
                        style={styles.pill}
                      >
                        <Text style={styles.pillText}>{alt.name}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Extra padding for bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function fmtKg(n: number | null | undefined): string {
  return n != null ? `${Math.round(n * 10) / 10} kg` : '—';
}

// Per-exercise progress: heaviest-weight chart + day-wise logged sets.
// Mounted with key={uuid} so it refetches when the exercise changes.
function ExerciseProgress({ uuid }: { uuid: string }) {
  const palette = useThemeColors();
  const styles = getStyles(palette);
  const { width } = useWindowDimensions();
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = cacheKeys.exerciseHistory(uuid);
      const cached = await idbGet<ExerciseHistory>(key);
      if (cached && !cancelled) {
        setHistory(cached);
        setLoading(false);
      }
      try {
        const fresh = await fetchExerciseHistory(uuid);
        if (!cancelled) {
          setHistory(fresh);
          idbSet(key, fresh, cacheTTL.MEDIUM).catch(() => {});
        }
      } catch {
        // keep cached / empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  if (loading && !history) {
    return <ActivityIndicator color={palette.primary} style={{ marginVertical: 24 }} />;
  }

  const days = history?.days ?? [];

  if (days.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>YOUR PROGRESS</Text>
        <View style={styles.emptyProgress}>
          <Text style={styles.emptyProgressText}>
            No history yet — log this exercise in a workout to track your progress.
          </Text>
        </View>
      </View>
    );
  }

  const summary = history!.summary;
  const chartData = days
    .filter((d) => d.max_weight_kg != null)
    .map((d) => ({ value: d.max_weight_kg as number, label: shortDate(d.date) }));
  const recent = [...days].reverse();
  // Badge only the single most-recent day that hit the all-time best.
  const bestDayId = recent.find(
    (d) => summary.best_weight_kg != null && d.max_weight_kg === summary.best_weight_kg
  )?.session_id;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>YOUR PROGRESS</Text>

      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>BEST</Text>
          <Text style={styles.statValue}>{fmtKg(summary.best_weight_kg)}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>EST. 1RM</Text>
          <Text style={styles.statValue}>{fmtKg(summary.best_est_1rm_kg)}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>SESSIONS</Text>
          <Text style={styles.statValue}>{summary.total_sessions}</Text>
        </View>
      </View>

      {chartData.length >= 2 ? (
        <View style={styles.chartCard}>
          <LineChart
            data={chartData}
            color={palette.primary}
            thickness={2.5}
            curved
            areaChart
            startFillColor={palette.primary}
            endFillColor={palette.primary}
            startOpacity={0.18}
            endOpacity={0.01}
            hideDataPoints={chartData.length > 8}
            dataPointsColor={palette.primary}
            hideRules
            yAxisColor="transparent"
            xAxisColor={palette.border}
            yAxisTextStyle={{ color: palette.mutedText, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: palette.mutedText, fontSize: 9 }}
            noOfSections={3}
            width={width - 96}
            height={150}
            initialSpacing={8}
            endSpacing={8}
          />
        </View>
      ) : null}

      <View style={styles.historyList}>
        {recent.map((d) => {
          const isPR = d.session_id === bestDayId;
          return (
            <View key={d.session_id} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayDateRow}>
                  <Text style={styles.dayDate}>{shortDate(d.date)}</Text>
                  {isPR ? (
                    <View style={styles.prBadge}>
                      <TrendingUp size={10} color={palette.primary} />
                      <Text style={styles.prText}>PR</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.dayVolume}>{Math.round(d.total_volume_kg).toLocaleString()} kg</Text>
              </View>
              <View style={styles.setChips}>
                {d.sets.map((s, i) => (
                  <View key={i} style={styles.setChip}>
                    <Text style={styles.setChipText}>
                      {s.weight_kg != null ? `${s.weight_kg}kg × ${s.reps}` : `${s.reps} reps`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: palette.border,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    flex: 1,
    paddingRight: 16,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 32,
  },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  videoBg: {
    width: '100%',
    height: '100%',
    backgroundColor: palette.surface,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NEON_LIME,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEON_LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  proTipCard: {
    backgroundColor: 'rgba(128, 242, 13, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.08)',
    borderRadius: 24,
    padding: 20,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proTipTitle: {
    color: NEON_LIME,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  proTipText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: palette.mutedText,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  muscleTagPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  muscleTagSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  muscleTagLabelPrimary: {
    color: palette.mutedText,
    fontSize: 14,
  },
  muscleTagValuePrimary: {
    color: NEON_LIME,
    fontSize: 14,
    fontWeight: '900',
  },
  muscleTagLabelSecondary: {
    color: palette.mutedText,
    fontSize: 14,
  },
  muscleTagValueSecondary: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '900',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: NEON_LIME,
    shadowColor: NEON_LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  instructionText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 24,
  },
  horizPills: {
    gap: 12,
    paddingRight: 16,
  },
  pill: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pillText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statRow: { flexDirection: 'row', gap: 10 },
  statTile: {
    flex: 1,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  statLabel: { color: palette.mutedText, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statValue: { color: palette.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  chartCard: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 24,
    paddingVertical: 16,
    paddingRight: 8,
    paddingLeft: 4,
    overflow: 'hidden',
  },
  historyList: { gap: 12 },
  dayCard: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDate: { color: palette.text, fontSize: 14, fontWeight: '800' },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(95, 199, 147, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  prText: { color: NEON_LIME, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  dayVolume: { color: palette.mutedText, fontSize: 12, fontWeight: '700' },
  setChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  setChip: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setChipText: { color: palette.text, fontSize: 12, fontWeight: '700' },
  emptyProgress: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    padding: 20,
  },
  emptyProgressText: { color: palette.mutedText, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
