import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { movementOf, partOf, type MovementPattern } from '@/src/features/workouts/model';
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

const movementThumbs: Record<MovementPattern, number> = {
  'horizontal-press': require('../../../../assets/images/exercise-thumbs/movement-horizontal-press.png'),
  'vertical-press': require('../../../../assets/images/exercise-thumbs/movement-vertical-press.png'),
  'horizontal-pull': require('../../../../assets/images/exercise-thumbs/movement-horizontal-pull.png'),
  'vertical-pull': require('../../../../assets/images/exercise-thumbs/movement-vertical-pull.png'),
  squat: require('../../../../assets/images/exercise-thumbs/movement-squat.png'),
  hinge: require('../../../../assets/images/exercise-thumbs/movement-hinge.png'),
  lunge: require('../../../../assets/images/exercise-thumbs/movement-lunge.png'),
  'core-anti-extension': require('../../../../assets/images/exercise-thumbs/movement-core-anti-extension.png'),
  'core-rotation': require('../../../../assets/images/exercise-thumbs/movement-core-rotation.png'),
  carry: require('../../../../assets/images/exercise-thumbs/movement-carry.png'),
  curl: require('../../../../assets/images/exercise-thumbs/movement-curl.png'),
  'triceps-extension': require('../../../../assets/images/exercise-thumbs/movement-triceps-extension.png'),
  calf: require('../../../../assets/images/exercise-thumbs/movement-calf.png'),
  cardio: require('../../../../assets/images/exercise-thumbs/movement-cardio.png'),
};

interface Props {
  exercise?: Partial<Pick<Exercise, 'primary_muscles' | 'tracking_type' | 'variations' | 'alternatives' | 'media_url' | 'video_url' | 'title' | 'category'>> | null;
  size?: number;
}

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

/** Only actual video posters; catalog stills can be clinical mannequin renders. */
export function exerciseImage(ex?: Props['exercise'], px = 160): string | null {
  return videoPoster(ex?.video_url, px) ?? videoPoster(ex?.media_url, px);
}

/** Keyed by source so one failed URL cannot suppress a subsequent exercise's image. */
function ThumbnailImage({ source, size, fallback }: { source: string; size: number; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  return failed ? fallback : (
    <Image source={{ uri: source }} style={{ width: size, height: size, borderRadius: Math.round(size / 5) }} resizeMode="cover" onError={() => setFailed(true)} />
  );
}

/** Video poster → movement illustration → generic body-part illustration. */
export function ExerciseThumb({ exercise, size = 56 }: Props) {
  const c = useThemeColors();
  const part = partOf(exercise);
  const tone = c.parts[part];
  const img = exerciseImage(exercise, size <= 64 ? 160 : 480);
  const movement = movementOf(exercise);
  const radius = Math.round(size / 4);
  const fallback = <Image source={movement ? movementThumbs[movement] : exerciseThumbs[part] ?? exerciseThumbs.core} resizeMode="contain"
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
