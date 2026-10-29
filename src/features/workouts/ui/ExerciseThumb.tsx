import { Timer } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { partOf, trackingOf } from '@/src/features/workouts/model';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { Exercise } from '@/src/types/exercise';

const exerciseThumbs: Record<string, number> = {
  chest: require('../../../../assets/images/exercise-thumbs/thumb-chest.png'),
  back: require('../../../../assets/images/exercise-thumbs/thumb-back.png'),
  legs: require('../../../../assets/images/exercise-thumbs/thumb-legs.png'),
  shoulders: require('../../../../assets/images/exercise-thumbs/thumb-shoulders.png'),
  arms: require('../../../../assets/images/exercise-thumbs/thumb-arms.png'),
  core: require('../../../../assets/images/exercise-thumbs/thumb-core.png'),
  cardio: require('../../../../assets/images/exercise-thumbs/thumb-cardio.png'),
};

interface Props {
  exercise?: Pick<Exercise, 'primary_muscles' | 'tracking_type' | 'variations' | 'alternatives' | 'media_url' | 'video_url'> | null;
  size?: number;
}

const VIDEO_EXT = /\.(?:mp4|m4v|mov|webm|avi|mkv|m3u8|mpd)$/i;
const CLOUDINARY_VIDEO = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+)\.(?:mp4|m4v|mov|webm)$/i;

/**
 * A still frame of a Cloudinary-hosted exercise video (the catalog's videos
 * live there): Cloudinary renders the frame halfway through as a JPEG, so the
 * thumbnail shows the actual movement. Two sizes keep the CDN cache shared.
 */
export function videoPoster(url: string | null | undefined, px = 160): string | null {
  const m = url?.trim().split(/[?#]/, 1)[0].match(CLOUDINARY_VIDEO);
  return m ? `${m[1]}so_50p,w_${px},h_${px},c_fill,q_auto,f_jpg/${m[2]}.jpg` : null;
}

/** Only this exercise's video poster or photo; anatomy diagrams and related moves are never thumbnails. */
export function exerciseImage(ex?: Props['exercise'], px = 160): string | null {
  const poster = videoPoster(ex?.video_url, px) ?? videoPoster(ex?.media_url, px);
  if (poster) return poster;
  const candidates = [ex?.media_url];
  for (const candidate of candidates) {
    const source = candidate?.trim();
    if (!source) continue;
    const path = source.split(/[?#]/, 1)[0];
    if (!VIDEO_EXT.test(path)) return source;
  }
  return null;
}

/** Keyed by source so one failed URL cannot suppress a subsequent exercise's image. */
function ThumbnailImage({ source, size, fallback }: { source: string; size: number; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  return failed ? fallback : (
    <Image source={{ uri: source }} style={{ width: size, height: size, borderRadius: Math.round(size / 5) }} resizeMode="cover" onError={() => setFailed(true)} />
  );
}

/** Square tile in the exercise's body-part colour, with a frame of its video (or its picture) when there is one. */
export function ExerciseThumb({ exercise, size = 56 }: Props) {
  const c = useThemeColors();
  const part = partOf(exercise);
  const tone = c.parts[part];
  const img = exerciseImage(exercise, size <= 64 ? 160 : 480);
  const t = trackingOf(exercise);
  const radius = Math.round(size / 4);
  const fallback = t === 'duration'
    ? <Timer size={Math.round(size * 0.46)} color={tone.fg} strokeWidth={1.7} accessible={false} />
    : <Image source={exerciseThumbs[part] ?? exerciseThumbs.core} resizeMode="contain"
        style={{ width: Math.round(size * 0.82), height: Math.round(size * 0.82) }} accessible={false} />;

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: tone.bg, borderWidth: 1, borderColor: tone.fg + '55' }]} accessible={false}>
      {img ? <ThumbnailImage key={img} source={img} size={Math.max(1, size - 8)} fallback={fallback} /> : fallback}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
