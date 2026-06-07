import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Vessel geometry (SVG user units) ---------------------------------------
const W = 220;
const H = 320;
const CX = W / 2;
const RIM_Y = 34; // top of the glass mouth
const BASE_Y = 298; // inner floor of the glass
const TOP_HALF = 78; // half-width at the rim (glass is slightly tapered)
const BOTTOM_HALF = 62; // half-width at the base
const RIM_RY = 13; // ellipse depth of the open mouth
const INTERIOR_TOP = RIM_Y + 6; // waterline can't go above this
const INTERIOR_H = BASE_Y - INTERIOR_TOP;

// Half-width of the glass interior at a given y — lets the clip taper naturally.
function halfWidthAt(y: number): number {
  'worklet';
  const tNorm = (y - RIM_Y) / (BASE_Y - RIM_Y);
  return TOP_HALF + (BOTTOM_HALF - TOP_HALF) * Math.max(0, Math.min(1, tNorm));
}

// A filled wave: sine surface at `baseY`, then down to the floor and closed.
function buildWave(phase: number, baseY: number, amp: number): string {
  'worklet';
  const steps = 26;
  let d = `M 0 ${baseY.toFixed(2)}`;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const y = baseY + Math.sin((i / steps) * Math.PI * 3 + phase) * amp;
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  d += ` L ${W} ${H} L 0 ${H} Z`;
  return d;
}

// The glass silhouette (rounded-bottom tumbler) reused for the clip + outline.
const GLASS_PATH = [
  `M ${CX - TOP_HALF} ${RIM_Y}`,
  `L ${CX - BOTTOM_HALF} ${BASE_Y - 18}`,
  `Q ${CX - BOTTOM_HALF} ${BASE_Y} ${CX - BOTTOM_HALF + 18} ${BASE_Y}`,
  `L ${CX + BOTTOM_HALF - 18} ${BASE_Y}`,
  `Q ${CX + BOTTOM_HALF} ${BASE_Y} ${CX + BOTTOM_HALF} ${BASE_Y - 18}`,
  `L ${CX + TOP_HALF} ${RIM_Y}`,
].join(' ');

interface Props {
  /** 0..1 fill level — fraction of the daily goal reached. */
  progress?: number;
  primary?: string;
  surfaceTint?: string;
}

export function WaterGlass({ progress = 0, primary = '#5fc793' }: Props) {
  const level = useSharedValue(0);
  const phase = useSharedValue(0);
  const b1 = useSharedValue(0);
  const b2 = useSharedValue(0);
  const b3 = useSharedValue(0);

  // Ease the waterline to the new level whenever intake changes.
  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress));
    level.value = withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, level]);

  // Continuous surface motion + rising bubbles.
  useEffect(() => {
    phase.value = withRepeat(withTiming(Math.PI * 2, { duration: 2600, easing: Easing.linear }), -1);
    const rise = { duration: 2400, easing: Easing.out(Easing.quad) };
    b1.value = withRepeat(withTiming(1, rise), -1);
    b2.value = withDelay(700, withRepeat(withTiming(1, rise), -1));
    b3.value = withDelay(1400, withRepeat(withTiming(1, rise), -1));
  }, [phase, b1, b2, b3]);

  // Waterline y for the current level (a tiny headroom so 100% still shows a crest).
  const waterTop = useDerivedValue(() => INTERIOR_TOP + (1 - level.value) * (INTERIOR_H - 6));

  const backWaveProps = useAnimatedProps(() => ({
    d: buildWave(phase.value + Math.PI * 0.6, waterTop.value + 3, 4),
  }));
  const frontWaveProps = useAnimatedProps(() => ({
    d: buildWave(phase.value, waterTop.value, 6),
  }));

  // Bubble travels from the floor up to just under the surface, fading near the top.
  const bubbleProps = (t: { value: number }, x: number, r: number) =>
    useAnimatedProps(() => {
      const top = waterTop.value + 10;
      const cy = BASE_Y - 12 - t.value * (BASE_Y - 12 - top);
      const visible = level.value > 0.08 ? 1 : 0;
      return { cy, r, cx: x, opacity: (1 - t.value) * 0.5 * visible };
    });

  const b1Props = bubbleProps(b1, CX - 26, 3);
  const b2Props = bubbleProps(b2, CX + 14, 2.4);
  const b3Props = bubbleProps(b3, CX + 30, 1.8);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9af3c4" stopOpacity="0.98" />
            <Stop offset="0.45" stopColor={primary} stopOpacity="0.95" />
            <Stop offset="1" stopColor="#2f9f72" stopOpacity="0.95" />
          </LinearGradient>
          <LinearGradient id="glassBody" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.02" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0.07" />
          </LinearGradient>
          <RadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={primary} stopOpacity="0.45" />
            <Stop offset="1" stopColor={primary} stopOpacity="0" />
          </RadialGradient>
          <ClipPath id="glassClip">
            <Path d={`${GLASS_PATH} Z`} />
          </ClipPath>
        </Defs>

        {/* Caustic glow pooled under the glass */}
        <Ellipse cx={CX} cy={BASE_Y + 8} rx={92} ry={22} fill="url(#glow)" />

        {/* Liquid (clipped to the glass interior) */}
        <Path d={`${GLASS_PATH} Z`} fill="url(#glassBody)" />
        <AnimatedPath animatedProps={backWaveProps} fill="#3fae82" opacity={0.55} clipPath="url(#glassClip)" />
        <AnimatedPath animatedProps={frontWaveProps} fill="url(#liquid)" clipPath="url(#glassClip)" />

        {/* Bubbles inside the liquid */}
        <AnimatedCircle animatedProps={b1Props} fill="#dffbec" clipPath="url(#glassClip)" />
        <AnimatedCircle animatedProps={b2Props} fill="#dffbec" clipPath="url(#glassClip)" />
        <AnimatedCircle animatedProps={b3Props} fill="#dffbec" clipPath="url(#glassClip)" />

        {/* Vertical specular highlight on the glass wall */}
        <Path
          d={`M ${CX - TOP_HALF + 16} ${RIM_Y + 18} L ${CX - BOTTOM_HALF + 22} ${BASE_Y - 30}`}
          stroke="#ffffff"
          strokeOpacity={0.12}
          strokeWidth={7}
          strokeLinecap="round"
          clipPath="url(#glassClip)"
        />

        {/* Glass outline + open mouth */}
        <Path d={GLASS_PATH} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={2} strokeLinejoin="round" />
        <Ellipse cx={CX} cy={RIM_Y} rx={TOP_HALF} ry={RIM_RY} fill="#0b0b0b" stroke="#ffffff" strokeOpacity={0.28} strokeWidth={2} />
        <Ellipse cx={CX} cy={RIM_Y} rx={TOP_HALF - 5} ry={RIM_RY - 4} fill="none" stroke="#ffffff" strokeOpacity={0.10} strokeWidth={1} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 220, height: 320, alignItems: 'center', justifyContent: 'center' },
});
