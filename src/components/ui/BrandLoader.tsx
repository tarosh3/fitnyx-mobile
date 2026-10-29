import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, View, type ActivityIndicatorProps } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { FiloGlyph } from '@/src/components/art/FiloGlyph';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Bundled, two-second mint-seed loop. Respect motion preferences and app lifecycle. */
export function BrandLoader({ size = 'small', color, style, animating = true, accessibilityLabel = 'Loading', testID }: ActivityIndicatorProps) {
  const c = useThemeColors();
  const initialReduced = useReducedMotion();
  const [reduced, setReduced] = useState(initialReduced);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const ref = useRef<LottieView>(null);
  const px = typeof size === 'number' ? size : size === 'large' ? 48 : 24;
  useEffect(() => {
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (active && animating && !reduced) ref.current?.play();
    else ref.current?.pause();
  }, [active, animating, reduced]);
  if (!animating) return null;
  const ink = typeof color === 'string' ? color : c.accent;
  return <View testID={testID} accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
    style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
    {reduced ? <FiloGlyph size={px} color={ink} /> : <LottieView ref={ref}
      source={require('../../../assets/animations/fitnyx-loading.json')} loop autoPlay={active}
      colorFilters={[1, 2, 3].map(n => ({ keypath: `Mint seed ${n}.Seed.Mint fill`, color: ink }))}
      style={{ width: px * 1.5, height: px }} />}
  </View>;
}
