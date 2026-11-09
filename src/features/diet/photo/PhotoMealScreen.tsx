import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { uuidV4 } from '@/src/features/roam/recordingStore';
import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { MealSlot } from '@/src/lib/api/diet';
import { localDateKey } from '@/src/lib/api/workoutSessions';
import { radii, spacing, type } from '@/src/styles/tokens';
import { saveMealLog } from '../data/dietLogs';
import { fmt, itemsTotal, SLOT_LABELS, SLOTS, slotForHour } from '../model';
import { MacroLine } from '../ui/bits';
import { photoLogItems, photoMealName } from './model';
import { HintBox, PhotoError, PhotoItems, ReadingCard } from './PhotoParts';
import { usePhotoMeal } from './usePhotoMeal';

/** /diet/photo?uri&date&slot — pushed by Log food with the picked photo. */
export function PhotoMealScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const toast = useToast();
  const bottomSpace = useBottomBarSpace();
  const params = useLocalSearchParams<{ uri?: string; date?: string; slot?: MealSlot }>();
  const uri = params.uri ?? '';
  const date = params.date ?? localDateKey(new Date());
  const slot: MealSlot = params.slot && SLOTS.includes(params.slot) ? params.slot : slotForHour(new Date().getHours());
  const { state, read, setQty } = usePhotoMeal(uri);
  const [saving, setSaving] = useState(false);

  const done = state.status === 'done' ? state : null;
  const items = done ? photoLogItems(done.result.items, done.qty) : [];
  const total = itemsTotal(items);

  const save = async () => {
    if (!done || !items.length || saving) return;
    setSaving(true);
    try {
      await saveMealLog({
        client_log_id: uuidV4(), local_date: date, slot, source: 'food',
        name: photoMealName(done.result.name, done.result.items, items), items,
      });
      // Back past Log food to wherever it was opened from.
      router.dismiss(2);
    } catch (e) {
      toast((e as Error)?.message || 'Couldn’t save that. Please try again.', 'error');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, { backgroundColor: c.background }]}>
      <TopBar title="Meal photo" subtitle={`Adding to ${SLOT_LABELS[slot]}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]} keyboardShouldPersistTaps="handled">
        {uri ? <Image source={{ uri }} style={[styles.photo, { backgroundColor: c.surface }]} resizeMode="cover" accessibilityLabel="Your meal photo" /> : null}
        {state.status === 'reading' ? <ReadingCard /> : null}
        {state.status === 'error' ? <PhotoError kind={state.kind} onRetry={() => read('')} onBack={() => router.back()} onPro={() => router.replace('/pro')} /> : null}
        {done ? <>
          <View style={styles.head}>
            <Text style={[styles.name, { color: c.text }]} accessibilityRole="header">{done.result.name}</Text>
            <MacroLine kcal={total.kcal} protein={total.protein} carbs={total.carbs} fat={total.fat} />
          </View>
          <PhotoItems items={done.result.items} qty={done.qty} onQty={setQty} />
          <Text style={[styles.note, { color: c.mutedText }]}>
            {[done.result.note, 'These are estimates. Change the amounts or remove anything that isn’t right.'].filter(Boolean).join(' ')}
          </Text>
          <HintBox onRead={read} />
        </> : null}
      </ScrollView>
      <BottomBar>
        <Button title={done ? (items.length ? `Add ${items.length} item${items.length === 1 ? '' : 's'} · ${fmt(total.kcal)} kcal to ${SLOT_LABELS[slot]}` : 'Keep at least one food') : 'Reading…'}
          disabled={!items.length} loading={saving} onPress={save} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.base + 4, paddingTop: spacing.sm, gap: spacing.base },
  photo: { width: '100%', height: 200, borderRadius: radii.xl },
  head: { gap: spacing.xs },
  name: { fontFamily: type.weight.extrabold, fontSize: 22, letterSpacing: -0.3 },
  note: { fontFamily: type.weight.regular, fontSize: 13, lineHeight: 19 },
});
