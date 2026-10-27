import { useVideoPlayer, VideoView } from 'expo-video';
import { X } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { finderMeta } from '@/src/features/workouts/finder';
import { exerciseImage } from '@/src/features/workouts/ui/ExerciseThumb';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useVideoSource } from '@/src/lib/offline/videoCache';
import type { Exercise } from '@/src/types/exercise';
import { radii, spacing, type } from '@/src/styles/tokens';

/** The exercise's video, looping and muted, so the user can match it to what they did. */
export function ExercisePreview({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const c = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const url = exercise.video_url?.trim() || null;
  // Offline, play the pre-cached file; with no cache, fall through to the still.
  const source = useVideoSource(url, isOnline);
  const player = useVideoPlayer(source, (p) => { p.loop = true; p.muted = true; p.play(); });
  const still = exerciseImage(exercise, 480);
  return (
    <View testID="exercise-preview" style={[styles.wrap, { backgroundColor: c.card, borderColor: c.border }]}>
      {source ? (
        <VideoView player={player} style={[styles.media, { backgroundColor: c.surface }]} contentFit="cover" nativeControls={false} />
      ) : still ? (
        <Image source={{ uri: still }} style={[styles.media, { backgroundColor: c.surface }]} resizeMode="cover" />
      ) : null}
      <View style={styles.head}>
        <View style={styles.grow}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{exercise.title}</Text>
          <Text style={[styles.meta, { color: c.mutedText }]} numberOfLines={1}>{finderMeta(exercise)}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close preview" style={styles.close}>
          <X size={20} color={c.mutedText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, borderRadius: radii.md + 2, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  media: { width: '100%', aspectRatio: 16 / 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  grow: { flex: 1, minWidth: 0 },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  meta: { fontFamily: type.weight.regular, fontSize: 14 },
  close: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
});
