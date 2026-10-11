import { useIsFocused } from 'expo-router';
import LottieView, { type LottieViewProps } from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';

type Props = Pick<LottieViewProps, 'source' | 'style'>;

/**
 * A decorative looping Lottie that only animates while its screen is focused.
 * Screens stay mounted under anything pushed on top of them, and a looping
 * animation there keeps burning CPU/GPU frames nobody can see.
 */
export function LoopingLottie({ source, style }: Props) {
  const ref = useRef<LottieView>(null);
  const focused = useIsFocused();

  useEffect(() => {
    if (focused) ref.current?.play();
    else ref.current?.pause();
  }, [focused]);

  return <LottieView ref={ref} source={source} style={style} autoPlay={focused} loop />;
}
