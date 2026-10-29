import { Trophy } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

const PIECES = 18;

/** "New best!" card with a short confetti burst. Tap anywhere (or wait) to close. */
export function PrCelebration({ title, detail, onClose }: { title: string; detail: string; onClose: () => void }) {
  const c = useThemeColors();
  const reduceMotion = useReducedMotion();
  const pop = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const palette = [c.gold.to, c.primary, c.parts.cardio.fg, c.parts.back.fg, c.parts.legs.fg];

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.(`New best! ${title}, ${detail}`);
    if (reduceMotion) {
      pop.setValue(1);
      burst.setValue(1);
    }
    const animation = Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    if (!reduceMotion) animation.start();
    const id = setTimeout(onClose, 3200);
    return () => { clearTimeout(id); animation.stop(); };
  }, [reduceMotion]);

  return (
    <Pressable testID="pr-celebration" onPress={onClose} style={styles.overlay} accessibilityRole="button" accessibilityLabel="Close">
      <View pointerEvents="none" style={styles.center}>
        {Array.from({ length: PIECES }).map((_, i) => {
          const angle = (i / PIECES) * Math.PI * 2;
          const dist = 120 + (i % 3) * 40;
          return (
            <Animated.View key={i} style={[styles.piece, {
              backgroundColor: palette[i % palette.length],
              opacity: burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist + 60] }) },
                { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 360}deg`] }) },
              ],
            }]} />
          );
        })}
        <Animated.View style={[styles.card, { backgroundColor: c.card, borderColor: c.gold.to, transform: [{ scale: pop }] }]}>
          <View style={[styles.medal, { backgroundColor: c.gold.to }]}>
            <Trophy size={34} color={c.gold.text} />
          </View>
          <Text style={[styles.big, { color: c.text }]}>New best!</Text>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.detail, { color: c.mutedText }]}>{detail}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100, elevation: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute', width: 10, height: 14, borderRadius: 3 },
  card: { alignItems: 'center', gap: 6, paddingVertical: spacing.xl, paddingHorizontal: spacing['2xl'], borderRadius: radii['2xl'], borderWidth: 2, maxWidth: 320 },
  medal: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  big: { fontFamily: type.weight.extrabold, fontSize: 28, letterSpacing: -0.5 },
  title: { fontFamily: type.weight.bold, fontSize: 17, textAlign: 'center' },
  detail: { fontFamily: type.weight.semibold, fontSize: 16, fontVariant: ['tabular-nums'] },
});
