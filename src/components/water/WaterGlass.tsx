import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);

const W = 220;
const H = 320;
const RIM_Y = 22;
const BOTTOM_Y = 296;
const INSET_X = 24;
const INNER_RIGHT = W - INSET_X;
const WATER_RANGE = BOTTOM_Y - RIM_Y - 6;

interface Props {
  progress: number; // 0..1
  primary: string;
  surfaceTint: string;
}

export function WaterGlass({ progress, primary, surfaceTint }: Props) {
  const fill = useSharedValue(0);
  const wave = useSharedValue(0);
  const b1 = useSharedValue(0);
  const b2 = useSharedValue(0);
  const b3 = useSharedValue(0);

  useEffect(() => {
    fill.value = withSpring(Math.max(0, Math.min(1, progress)), {
      damping: 14,
      stiffness: 90,
      mass: 0.8,
    });
  }, [progress, fill]);

  useEffect(() => {
    wave.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
    const loop = (sv: SharedValue<number>, delay: number, duration: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration, easing: Easing.in(Easing.quad) }), -1, false)
      );
    };
    loop(b1, 0, 3200);
    loop(b2, 1000, 2600);
    loop(b3, 2000, 3800);
  }, [wave, b1, b2, b3]);

  const waterRectProps = useAnimatedProps(() => {
    const filled = fill.value;
    const h = filled * WATER_RANGE;
    const y = BOTTOM_Y - h - 2;
    return { y, height: h + 4 } as any;
  });

  const surfaceProps = useAnimatedProps(() => {
    const filled = fill.value;
    const cy = BOTTOM_Y - filled * WATER_RANGE - 2;
    return { cy, opacity: filled > 0.02 ? 1 : 0 } as any;
  });

  const waveGroupProps = useAnimatedProps(() => {
    return { x: -20 + wave.value * 20 } as any;
  });

  const bubble1Props = useAnimatedProps(() => {
    const filled = fill.value;
    const startY = BOTTOM_Y - 10;
    const endY = BOTTOM_Y - filled * WATER_RANGE + 4;
    return {
      cy: startY + (endY - startY) * b1.value,
      cx: 80 + Math.sin(b1.value * Math.PI * 2) * 4,
      opacity: filled > 0.05 ? 1 - b1.value : 0,
    } as any;
  });
  const bubble2Props = useAnimatedProps(() => {
    const filled = fill.value;
    const startY = BOTTOM_Y - 10;
    const endY = BOTTOM_Y - filled * WATER_RANGE + 4;
    return {
      cy: startY + (endY - startY) * b2.value,
      cx: 130 + Math.sin(b2.value * Math.PI * 2) * 4,
      opacity: filled > 0.05 ? 1 - b2.value : 0,
    } as any;
  });
  const bubble3Props = useAnimatedProps(() => {
    const filled = fill.value;
    const startY = BOTTOM_Y - 10;
    const endY = BOTTOM_Y - filled * WATER_RANGE + 4;
    return {
      cy: startY + (endY - startY) * b3.value,
      cx: 105 + Math.sin(b3.value * Math.PI * 2) * 4,
      opacity: filled > 0.05 ? 1 - b3.value : 0,
    } as any;
  });

  // Glass body path: rounded rectangle, slightly tapered at bottom
  const glassPath = `
    M ${INSET_X + 6} ${RIM_Y}
    L ${INNER_RIGHT - 6} ${RIM_Y}
    Q ${INNER_RIGHT} ${RIM_Y} ${INNER_RIGHT} ${RIM_Y + 8}
    L ${INNER_RIGHT - 4} ${BOTTOM_Y - 30}
    Q ${INNER_RIGHT - 4} ${BOTTOM_Y} ${W / 2} ${BOTTOM_Y}
    Q ${INSET_X + 4} ${BOTTOM_Y} ${INSET_X + 4} ${BOTTOM_Y - 30}
    L ${INSET_X} ${RIM_Y + 8}
    Q ${INSET_X} ${RIM_Y} ${INSET_X + 6} ${RIM_Y}
    Z
  `;

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <ClipPath id="glassClip">
            <Path d={glassPath} />
          </ClipPath>
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={primary} stopOpacity="0.95" />
            <Stop offset="1" stopColor={primary} stopOpacity="0.7" />
          </LinearGradient>
          <LinearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.06" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.02" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.1" />
          </LinearGradient>
          <LinearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.4" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.3" />
          </LinearGradient>
        </Defs>

        {/* Glass body fill (subtle tint) */}
        <Path d={glassPath} fill="url(#glassGrad)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />

        {/* Water (clipped to glass) */}
        <G clipPath="url(#glassClip)">
          <AnimatedRect
            animatedProps={waterRectProps}
            x={INSET_X - 2}
            width={INNER_RIGHT - INSET_X + 4}
            fill="url(#waterGrad)"
          />

          {/* Wavy water surface */}
          <AnimatedG animatedProps={waveGroupProps}>
            <AnimatedEllipse
              animatedProps={surfaceProps}
              cx={W / 2}
              rx={INNER_RIGHT - INSET_X + 10}
              ry={6}
              fill={surfaceTint}
              opacity={0.9}
            />
            <AnimatedEllipse
              animatedProps={surfaceProps}
              cx={W / 2 + 30}
              rx={(INNER_RIGHT - INSET_X) / 2}
              ry={4}
              fill="#FFFFFF"
              opacity={0.18}
            />
          </AnimatedG>

          {/* Bubbles */}
          <AnimatedCircle animatedProps={bubble1Props} r={3} fill="#FFFFFF" opacity={0.5} />
          <AnimatedCircle animatedProps={bubble2Props} r={2} fill="#FFFFFF" opacity={0.45} />
          <AnimatedCircle animatedProps={bubble3Props} r={2.5} fill="#FFFFFF" opacity={0.4} />
        </G>

        {/* Inner left-side highlight */}
        <Path
          d={`M ${INSET_X + 10} ${RIM_Y + 18} Q ${INSET_X + 4} ${H / 2} ${INSET_X + 14} ${BOTTOM_Y - 50}`}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner right highlight (thin) */}
        <Path
          d={`M ${INNER_RIGHT - 12} ${RIM_Y + 40} L ${INNER_RIGHT - 14} ${BOTTOM_Y - 70}`}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Rim ellipse */}
        <Ellipse
          cx={W / 2}
          cy={RIM_Y}
          rx={(INNER_RIGHT - INSET_X) / 2}
          ry={5}
          fill="none"
          stroke="url(#rimGrad)"
          strokeWidth="2"
        />
        <Ellipse
          cx={W / 2}
          cy={RIM_Y + 2}
          rx={(INNER_RIGHT - INSET_X) / 2 - 2}
          ry={3}
          fill="rgba(255,255,255,0.04)"
        />

        {/* Base shadow ellipse */}
        <Ellipse cx={W / 2} cy={BOTTOM_Y + 8} rx={70} ry={6} fill="rgba(0,0,0,0.35)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
