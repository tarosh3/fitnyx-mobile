import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

// Self-contained vector Lottie (no external image assets) of an animated
// water glass. The asset is a continuous loop (water bobs and returns), so it
// is decorative — the actual intake level is shown by the screen's readout and
// fill bar. Swap in an empty->full fill animation here to drive it by progress.
const source = require('../../../assets/lottie/water-glass.json');

interface Props {
  /** Kept for API compatibility with the screen; the looping asset ignores it. */
  progress?: number;
  primary?: string;
  surfaceTint?: string;
}

export function WaterGlass(_props: Props) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <LottieView source={source} autoPlay loop resizeMode="contain" style={styles.fill} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 220, height: 320, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
});
