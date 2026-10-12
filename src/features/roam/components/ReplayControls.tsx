import Slider from '@react-native-community/slider';
import { LocateFixed, Pause, Play, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReplayPlayer } from '@/src/features/roam/useReplayPlayer';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  player: ReplayPlayer;
  duration: number;
  follow: boolean;
  onToggleFollow: () => void;
}

/** Play / pause, a scrubber, playback speed and camera follow — one row under the map. */
export function ReplayControls({ player, duration, follow, onToggleFollow }: Props) {
  const c = useThemeColors();
  const finished = player.active && !player.playing && player.position >= duration;
  const PlayIcon = player.playing ? Pause : finished ? RotateCcw : Play;

  return (
    <View style={[styles.bar, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable
        testID="replay-play"
        accessibilityRole="button"
        accessibilityLabel={player.playing ? 'Pause replay' : finished ? 'Replay again' : 'Play route replay'}
        onPress={player.playing ? player.pause : player.play}
        hitSlop={6}
        style={({ pressed }) => [styles.play, { backgroundColor: c.primary }, pressed && styles.pressed]}
      >
        <PlayIcon size={20} color={c.primaryText} fill={player.playing || finished ? 'none' : c.primaryText} />
      </Pressable>

      <Slider
        testID="replay-scrub"
        accessibilityLabel="Replay position"
        style={styles.slider}
        minimumValue={0}
        maximumValue={duration}
        value={player.position}
        onValueChange={(v) => {
          if (player.playing) player.pause();
          player.seek(v);
        }}
        minimumTrackTintColor={c.primary}
        maximumTrackTintColor={c.border}
        thumbTintColor={c.primary}
      />

      <Pressable
        testID="replay-rate"
        accessibilityRole="button"
        accessibilityLabel={`Playback speed ${player.rate} times. Tap to change.`}
        onPress={player.cycleRate}
        hitSlop={6}
        style={({ pressed }) => [styles.chip, { borderColor: c.border }, pressed && styles.pressed]}
      >
        <Text style={[styles.chipText, { color: c.text }]}>{player.rate}×</Text>
      </Pressable>

      <Pressable
        testID="replay-follow"
        accessibilityRole="switch"
        accessibilityState={{ checked: follow }}
        accessibilityLabel="Follow the route with the camera"
        onPress={onToggleFollow}
        hitSlop={6}
        style={({ pressed }) => [
          styles.chip,
          { borderColor: follow ? c.primary : c.border, backgroundColor: follow ? c.accentSoft : 'transparent' },
          pressed && styles.pressed,
        ]}
      >
        <LocateFixed size={17} color={follow ? c.accent : c.mutedText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  slider: { flex: 1, height: 40 },
  chip: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.75 },
});
