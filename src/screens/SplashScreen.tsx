/**
 * Premium Animated Splash Screen — "Cinematic Logo Reveal"
 *
 * Ported from web GSAP animation. Timeline:
 *   0-1400ms    – Logo outlines draw themselves (stroke-dashoffset)
 *   1000-1600ms – Filled logo fades in over the outlines
 *   1400-1800ms – Outlines dim as fill takes over
 *   1600-2100ms – Light sweep across logo
 *   2000-2500ms – Logo scale pop
 *   2200-2800ms – "FITNYX" wordmark fades in + slides up
 *   2600-3100ms – Tagline fades in
 *   3800-4300ms – Cinematic exit (scale up + fade)
 *   4400ms      – onAnimationComplete
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

import {
  LOGO_VIEWBOX,
  LOGO_PATH_1,
  LOGO_PATH_1_LENGTH,
  LOGO_PATH_2,
  LOGO_PATH_2_LENGTH,
} from './logoPathData';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_W } = Dimensions.get('window');

// Square container — both SVG (2048x2048 viewBox) and PNG (7680x7680) are square
const LOGO_SIZE = SCREEN_W * 0.55;

const PRIMARY = '#5fc793';
const BG = '#050505';

interface Props {
  onAnimationComplete?: () => void;
}

export function AnimatedSplash({ onAnimationComplete }: Props) {
  // Stroke drawing (0 = fully hidden, 1 = fully drawn)
  const strokeProgress1 = useSharedValue(0);
  const strokeProgress2 = useSharedValue(0);
  const strokeOpacity = useSharedValue(1);

  // Filled logo
  const fillOpacity = useSharedValue(0);

  // Light sweep
  const sweepX = useSharedValue(-1.5);

  // Scale pop
  const logoPop = useSharedValue(1);

  // Wordmark — per-letter typewriter (F-I-T-N-Y-X)
  const LETTERS = ['F', 'I', 'T', 'N', 'Y', 'X'];
  const letterProgress = LETTERS.map(() => useSharedValue(0));

  // Cursor blink
  const cursorOpacity = useSharedValue(0);

  // Tagline
  const taglineOpacity = useSharedValue(0);

  // Exit
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);

  // Float
  const floatY = useSharedValue(0);

  useEffect(() => {
    // ── Stage 1: Stroke drawing (0-1400ms) ──
    strokeProgress1.value = withTiming(1, {
      duration: 1400,
      easing: Easing.inOut(Easing.cubic),
    });
    strokeProgress2.value = withDelay(
      200,
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) })
    );

    // ── Stage 2: Fill reveal (1000-1600ms) ──
    fillOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

    // ── Stage 3: Fade outlines (1400-1800ms) ──
    strokeOpacity.value = withDelay(
      1400,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    // ── Stage 4: Light sweep (1600-2100ms) ──
    sweepX.value = withDelay(
      1600,
      withTiming(1.5, { duration: 500, easing: Easing.inOut(Easing.cubic) })
    );

    // ── Stage 5: Scale pop (2000-2500ms) ──
    logoPop.value = withDelay(
      2000,
      withSequence(
        withSpring(1.08, { damping: 8, stiffness: 200, mass: 0.5 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      )
    );

    // ── Stage 6: Wordmark typewriter (2200ms+, 100ms stagger per letter) ──
    const TYPE_START = 2200;
    const STAGGER = 100;
    letterProgress.forEach((lp, i) => {
      lp.value = withDelay(
        TYPE_START + i * STAGGER,
        withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) })
      );
    });
    // Cursor: show at type start, blink, then hide after all letters typed
    cursorOpacity.value = withDelay(
      TYPE_START,
      withSequence(
        withTiming(1, { duration: 50 }),
        // Blink during typing
        ...Array.from({ length: 3 }, () => [
          withTiming(0, { duration: 200 }),
          withTiming(1, { duration: 200 }),
        ]).flat(),
        // Fade out after typing completes
        withDelay(200, withTiming(0, { duration: 300 }))
      )
    );

    // ── Stage 7: Tagline (after typing completes) ──
    const TAGLINE_START = TYPE_START + LETTERS.length * STAGGER + 400;
    taglineOpacity.value = withDelay(TAGLINE_START, withTiming(1, { duration: 500 }));

    // ── Stage 8: Idle float (3000ms+) ──
    floatY.value = withDelay(
      3000,
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      )
    );

    // ── Stage 9: Cinematic exit (5800-6300ms) — 2s hold after animation ──
    exitScale.value = withDelay(
      5800,
      withTiming(1.2, { duration: 500, easing: Easing.in(Easing.cubic) })
    );
    exitOpacity.value = withDelay(
      5800,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) })
    );

    if (onAnimationComplete) {
      const timer = setTimeout(onAnimationComplete, 6400);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── Animated props for SVG stroke drawing ────────────────────────────
  const strokeProps1 = useAnimatedProps(() => ({
    strokeDashoffset: LOGO_PATH_1_LENGTH * (1 - strokeProgress1.value),
  }));

  const strokeProps2 = useAnimatedProps(() => ({
    strokeDashoffset: LOGO_PATH_2_LENGTH * (1 - strokeProgress2.value),
  }));

  // ── Animated styles ──────────────────────────────────────────────────
  const exitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: exitScale.value }],
    opacity: exitOpacity.value,
  }));

  const strokeGroupStyle = useAnimatedStyle(() => ({
    opacity: strokeOpacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fillOpacity.value,
  }));

  const logoWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoPop.value },
      { translateY: floatY.value },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweepX.value, [-1.5, -0.5, 0.5, 1.5], [0, 0.5, 0.5, 0]),
    transform: [
      { translateX: sweepX.value * LOGO_SIZE },
      { rotate: '15deg' },
    ],
  }));

  // Per-letter animated styles
  const letterStyles = letterProgress.map((lp) =>
    useAnimatedStyle(() => ({
      opacity: lp.value,
      transform: [
        { translateY: interpolate(lp.value, [0, 1], [12, 0]) },
        { scale: interpolate(lp.value, [0, 1], [0.7, 1]) },
      ],
    }))
  );

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} translucent />

      <Animated.View style={[styles.container, exitStyle]}>
        {/* ── Logo group (square container) ── */}
        <Animated.View style={[styles.logoGroup, logoWrapperStyle]}>
          {/* Stroke-drawn outlines */}
          <Animated.View style={[StyleSheet.absoluteFill, strokeGroupStyle]}>
            <Svg
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              viewBox={LOGO_VIEWBOX}
            >
              <Defs>
                <LinearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#7DDFB0" />
                  <Stop offset="100%" stopColor="#4FB783" />
                </LinearGradient>
              </Defs>
              <AnimatedPath
                d={LOGO_PATH_1}
                stroke="url(#strokeGrad)"
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={LOGO_PATH_1_LENGTH}
                animatedProps={strokeProps1}
              />
              <AnimatedPath
                d={LOGO_PATH_2}
                stroke="url(#strokeGrad)"
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={LOGO_PATH_2_LENGTH}
                animatedProps={strokeProps2}
              />
            </Svg>
          </Animated.View>

          {/* Filled logo PNG (same square size, fades in over outlines) */}
          <Animated.View style={[StyleSheet.absoluteFill, fillStyle]}>
            <Image
              source={require('@/assets/images/fitnyx_logo_4k_transparent.png')}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Light sweep */}
          <Animated.View style={[styles.sweep, sweepStyle]} />
        </Animated.View>

        {/* ── Wordmark (typewriter) ── */}
        <View style={styles.wordmarkWrap}>
          <View style={styles.wordmarkRow}>
            {LETTERS.map((letter, i) => (
              <Animated.Text key={i} style={[styles.wordmarkLetter, letterStyles[i]]}>
                {letter}
              </Animated.Text>
            ))}
            <Animated.View style={[styles.cursor, cursorStyle]} />
          </View>
          <View style={styles.underline} />
        </View>

        {/* ── Tagline ── */}
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>YOUR AI FITNESS COMPANION</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Square container — SVG viewBox is 2048x2048, PNG is 7680x7680
  logoGroup: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // Light sweep
  sweep: {
    position: 'absolute',
    width: 40,
    height: LOGO_SIZE * 1.4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    top: -LOGO_SIZE * 0.2,
    left: LOGO_SIZE / 2 - 20,
  },

  // Wordmark (typewriter)
  wordmarkWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkLetter: {
    fontFamily: 'Anton_400Regular',
    fontSize: 40,
    color: '#FFFFFF',
    marginHorizontal: 3,
    textShadowColor: 'rgba(95, 199, 147, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  cursor: {
    width: 2,
    height: 34,
    backgroundColor: PRIMARY,
    marginLeft: 2,
    borderRadius: 1,
  },
  underline: {
    width: 50,
    height: 2,
    backgroundColor: PRIMARY,
    marginTop: 8,
    borderRadius: 1,
    opacity: 0.5,
  },

  // Tagline
  tagline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 4,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 12,
  },
});
