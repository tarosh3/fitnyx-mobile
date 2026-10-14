import { Timer } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { partOf, trackingOf } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Exercise } from '@/src/types/exercise';
import { WorkoutGlyph } from './WorkoutGlyph';

interface Props {
  exercise?: Pick<Exercise, 'primary_muscles' | 'tracking_type' | 'variations' | 'alternatives' | 'media_url'> | null;
  size?: number;
}

/** Use this exercise's image or its primary muscle illustration, never another move. */
export function exerciseImage(ex?: Props['exercise']): string | null {
  const candidates = [ex?.media_url, ...(ex?.primary_muscles ?? []).map((muscle) => muscle.image)];
  for (const candidate of candidates) {
    const source = candidate?.trim();
    if (!source) continue;
    const path = source.split(/[?#]/, 1)[0];
    if (!/\.(?:mp4|m4v|mov|webm|avi|mkv|m3u8|mpd)$/i.test(path)) return source;
  }
  return null;
}

/** Keyed by source so one failed URL cannot suppress a subsequent exercise's image. */
function ThumbnailImage({ source, size, fallback }: { source: string; size: number; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  return failed ? fallback : (
    <Image source={{ uri: source }} style={{ width: size, height: size }} resizeMode="cover" onError={() => setFailed(true)} />
  );
}

/** Square tile in the exercise's body-part colour, with its picture when there is one. */
export function ExerciseThumb({ exercise, size = 56 }: Props) {
  const c = useThemeColors();
  const part = partOf(exercise);
  const tone = c.parts[part];
  const img = exerciseImage(exercise);
  const t = trackingOf(exercise);
  const radius = Math.round(size / 4);
  const fallback = t === 'duration'
    ? <Timer size={Math.round(size * 0.46)} color={tone.fg} strokeWidth={1.7} accessible={false} />
    : <WorkoutGlyph part={part} size={Math.round(size * 0.7)} color={tone.fg} />;

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: tone.bg }]} accessible={false}>
      {img ? <ThumbnailImage key={img} source={img} size={size} fallback={fallback} /> : fallback}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
