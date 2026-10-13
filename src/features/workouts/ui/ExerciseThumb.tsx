import { Dumbbell, HeartPulse, PersonStanding, Timer } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { partOf, trackingOf } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Exercise } from '@/src/types/exercise';

interface Props {
  exercise?: Pick<Exercise, 'primary_muscles' | 'tracking_type' | 'variations' | 'alternatives' | 'media_url'> | null;
  size?: number;
}

/** First still image the catalog has for an exercise (videos are .mp4). */
export function exerciseImage(ex?: Props['exercise']): string | null {
  // The exercise's own picture first; a variation's image shows a different move.
  const candidates = [ex?.media_url, ex?.variations?.[0]?.image, ex?.primary_muscles?.[0]?.image, ex?.alternatives?.[0]?.image];
  return candidates.find((u): u is string => !!u && !u.endsWith('.mp4')) ?? null;
}

/** Square tile in the exercise's body-part colour, with its picture when there is one. */
export function ExerciseThumb({ exercise, size = 56 }: Props) {
  const c = useThemeColors();
  const tone = c.parts[partOf(exercise)];
  const [failed, setFailed] = useState(false);
  const img = failed ? null : exerciseImage(exercise);
  const t = trackingOf(exercise);
  const Icon = t === 'cardio' ? HeartPulse : t === 'duration' ? Timer : t === 'reps' ? PersonStanding : Dumbbell;
  const radius = Math.round(size / 4);

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: tone.bg }]} accessible={false}>
      {img ? (
        <Image source={{ uri: img }} style={{ width: size, height: size }} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <>
          <View style={[styles.bubble, { backgroundColor: tone.fg, width: size * 0.75, height: size * 0.75, borderRadius: size }]} />
          <Icon size={Math.round(size * 0.46)} color={tone.fg} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bubble: { position: 'absolute', right: '-30%', bottom: '-40%', opacity: 0.14 },
});
