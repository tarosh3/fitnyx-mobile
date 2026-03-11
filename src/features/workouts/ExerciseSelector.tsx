import { Check, ChevronRight, Dumbbell, Plus, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { DayData } from '@/src/features/workouts/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { sanitizeSearch, sanitizeNumericInt, sanitizeNumericDecimal, MAX_SEARCH } from '@/src/lib/validators';
import {
  addExercisesToDay,
  CreateExerciseInput,
  Exercise,
  getDayExercises,
  searchExercises,
  WorkoutDayExercise,
} from '@/src/lib/api/workoutPlans';

const NEON_LIME = '#5fc793';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

interface ExerciseSelectorProps {
  planId: string;
  days: DayData[];
  dayIds: string[];
  onFinish: () => void;
}

const MAX_EXERCISES_PER_DAY = 15;

export function ExerciseSelector({ days, dayIds, onFinish }: ExerciseSelectorProps) {
  const palette = useThemeColors();

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Map<string, WorkoutDayExercise[]>>(new Map());
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    target_sets: 3,
    target_reps: 10,
    target_weight_kg: undefined as number | undefined,
    rest_seconds: 90,
  });

  const currentDay = days[currentDayIndex];
  const currentDayId = dayIds[currentDayIndex];
  const currentExercises = selectedExercises.get(currentDayId) || [];

  const canAddMore = currentExercises.length < MAX_EXERCISES_PER_DAY;
  const isLastDay = currentDayIndex === days.length - 1;

  useEffect(() => {
    if (!currentDayId || selectedExercises.has(currentDayId)) return;

    getDayExercises(currentDayId)
      .then((res) => {
        setSelectedExercises((prev) => new Map(prev).set(currentDayId, res.data));
      })
      .catch(() => undefined);
  }, [currentDayId, selectedExercises]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await searchExercises(searchQuery, undefined, 1, 30);
        setSearchResults(result.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!currentDay?.is_rest_day) return;

    if (isLastDay) {
      const timer = setTimeout(onFinish, 100);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentDayIndex((prev) => Math.min(prev + 1, days.length - 1));
    }, 100);

    return () => clearTimeout(timer);
  }, [currentDay, isLastDay, onFinish, days.length]);

  const addExercise = async () => {
    if (!selectedExercise || !currentDayId) return;

    setAdding(true);
    try {
      const payload: CreateExerciseInput = {
        exercise_uuid: selectedExercise.uuid,
        target_sets: exerciseForm.target_sets,
        target_reps: exerciseForm.target_reps,
        target_weight_kg: exerciseForm.target_weight_kg,
        rest_seconds: exerciseForm.rest_seconds,
      };

      const result = await addExercisesToDay(currentDayId, [payload]);
      const updated = [...currentExercises, ...result.data];
      setSelectedExercises((prev) => new Map(prev).set(currentDayId, updated));

      setSelectedExercise(null);
      setShowAddForm(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Failed to add exercise', error);
    } finally {
      setAdding(false);
    }
  };

  const goNextDay = () => {
    if (isLastDay) {
      onFinish();
      return;
    }

    setCurrentDayIndex((prev) => Math.min(prev + 1, days.length - 1));
    setSearchQuery('');
    setSearchResults([]);
    setSelectedExercise(null);
    setShowAddForm(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainCard}>
        <View style={styles.mainHeader}>
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbText}>DAY {currentDayIndex + 1}</Text>
          </View>
          <Text style={styles.dayTitle}>{currentDay?.title?.toUpperCase() || 'WORKOUT DAY'}</Text>
          <View style={styles.exerciseCountRow}>
            <Dumbbell size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.exerciseCountText}>
              {currentExercises.length} / {MAX_EXERCISES_PER_DAY} EXERCISES
            </Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={18} color="rgba(255,255,255,0.3)" />
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="SEARCH EXERCISES..."
            sanitize={sanitizeSearch}
            maxLength={MAX_SEARCH}
            style={styles.searchInput}
          />
        </View>

        {searchQuery ? (
          <View style={styles.searchResultsWrap}>
            <ScrollView style={{ maxHeight: 250 }} keyboardShouldPersistTaps="handled">
              {searching ? (
                <View style={styles.loaderWrap}>
                  <Text style={styles.infoText}>SEARCHING...</Text>
                </View>
              ) : null}

              {!searching && searchResults.length === 0 ? (
                <View style={styles.loaderWrap}>
                  <Text style={styles.infoText}>NO EXERCISES FOUND</Text>
                </View>
              ) : null}

              {searchResults.map((exercise) => (
                <Pressable
                  key={exercise.uuid}
                  onPress={() => {
                    if (!canAddMore) return;
                    setSelectedExercise(exercise);
                    setShowAddForm(true);
                    setExerciseForm({ target_sets: 3, target_reps: 10, target_weight_kg: undefined, rest_seconds: 90 });
                  }}
                  style={({ pressed }) => [
                    styles.searchResultItem,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }
                  ]}
                >
                  <Text style={styles.searchResultText}>{exercise.title.toUpperCase()}</Text>
                  <Plus size={16} color={NEON_LIME} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {showAddForm && selectedExercise ? (
        <View style={styles.addFormCard}>
          <View style={styles.addFormHeader}>
            <View style={styles.addIconWrap}>
              <Plus size={14} color="#000" />
            </View>
            <Text style={styles.addFormTitle}>ADD: {selectedExercise.title.toUpperCase()}</Text>
            <Pressable onPress={() => setShowAddForm(false)}>
              <X size={20} color="rgba(255,255,255,0.3)" />
            </Pressable>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.formItem}>
              <Text style={styles.fieldLabel}>SETS</Text>
              <Input
                keyboardType="number-pad"
                value={`${exerciseForm.target_sets}`}
                onChangeText={(value) => setExerciseForm((prev) => ({ ...prev, target_sets: Number(value) || 0 }))}
                sanitize={(v) => sanitizeNumericInt(v, 3)}
                maxLength={3}
                style={styles.miniInput}
              />
            </View>
            <View style={styles.formItem}>
              <Text style={styles.fieldLabel}>REPS</Text>
              <Input
                keyboardType="number-pad"
                value={`${exerciseForm.target_reps}`}
                onChangeText={(value) => setExerciseForm((prev) => ({ ...prev, target_reps: Number(value) || 0 }))}
                sanitize={(v) => sanitizeNumericInt(v, 3)}
                maxLength={3}
                style={styles.miniInput}
              />
            </View>
            <View style={styles.formItem}>
              <Text style={styles.fieldLabel}>WEIGHT(KG)</Text>
              <Input
                keyboardType="decimal-pad"
                value={exerciseForm.target_weight_kg ? `${exerciseForm.target_weight_kg}` : ''}
                onChangeText={(value) =>
                  setExerciseForm((prev) => ({
                    ...prev,
                    target_weight_kg: value ? Number(value) : undefined,
                  }))
                }
                sanitize={(v) => sanitizeNumericDecimal(v, 6)}
                maxLength={6}
                style={styles.miniInput}
              />
            </View>
            <View style={styles.formItem}>
              <Text style={styles.fieldLabel}>REST(S)</Text>
              <Input
                keyboardType="number-pad"
                value={`${exerciseForm.rest_seconds}`}
                onChangeText={(value) => setExerciseForm((prev) => ({ ...prev, rest_seconds: Number(value) || 0 }))}
                sanitize={(v) => sanitizeNumericInt(v, 4)}
                maxLength={4}
                style={styles.miniInput}
              />
            </View>
          </View>

          <Pressable
            disabled={adding}
            onPress={addExercise}
            style={({ pressed }) => [
              styles.addSubmitBtn,
              adding && { opacity: 0.5 },
              pressed && { scale: 0.98 }
            ]}
          >
            <Text style={styles.addSubmitBtnText}>
              {adding ? 'ADDING...' : 'ADD TO DAY'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {currentExercises.length ? (
        <View style={styles.addedCard}>
          <Text style={styles.addedTitle}>ADDED EXERCISES</Text>
          {currentExercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.addedRow}>
              <View style={styles.addedIndex}>
                <Text style={styles.addedIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.addedDetails}>
                <Text style={styles.addedName}>{exercise.exercise?.title?.toUpperCase()}</Text>
                <Text style={styles.addedMeta}>
                  {exercise.target_sets} SETS × {exercise.target_reps} REPS
                  {exercise.target_weight_kg ? ` @ ${exercise.target_weight_kg}KG` : ''}
                </Text>
              </View>
              <Check size={16} color={NEON_LIME} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footerButtons}>
        <Pressable
          onPress={goNextDay}
          style={styles.skipBtn}
        >
          <Text style={styles.skipBtnText}>SKIP DAY</Text>
        </Pressable>

        <Pressable
          onPress={goNextDay}
          style={styles.nextBtn}
        >
          <Text style={styles.nextBtnText}>
            {isLastDay ? 'FINISH PLAN' : 'NEXT DAY'}
          </Text>
          <ChevronRight size={18} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  mainCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    gap: 20,
  },
  mainHeader: {
    gap: 6,
  },
  breadcrumb: {
    backgroundColor: 'rgba(128, 242, 13, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.2)',
  },
  breadcrumbText: {
    color: NEON_LIME,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dayTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  exerciseCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseCountText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
    height: 52,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  searchResultsWrap: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  loaderWrap: {
    padding: 20,
    alignItems: 'center',
  },
  infoText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
  },
  searchResultText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  addFormCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: NEON_LIME,
    padding: 20,
    gap: 20,
  },
  addFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: NEON_LIME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFormTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  formItem: {
    flex: 1,
    gap: 8,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  miniInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    height: 44,
    borderRadius: 10,
    borderColor: BORDER_COLOR,
    textAlign: 'center',
    fontSize: 14,
  },
  addSubmitBtn: {
    backgroundColor: NEON_LIME,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubmitBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  addedCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    gap: 12,
  },
  addedTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  addedIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedIndexText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
  },
  addedDetails: {
    flex: 1,
    gap: 2,
  },
  addedName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  addedMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  skipBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '800',
  },
  nextBtn: {
    flex: 1.5,
    height: 56,
    borderRadius: 18,
    backgroundColor: NEON_LIME,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
});
