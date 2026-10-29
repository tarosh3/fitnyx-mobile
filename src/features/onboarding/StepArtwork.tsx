import React, { createContext, useContext } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { ContourArt, type ContourSubject } from '@/src/components/art/ContourArt';

export const OnboardingArtContext = createContext<number | null>(null);
const subjects: Record<number, ContourSubject> = {
  1: 'username', 2: 'birth', 3: 'identity', 4: 'height', 5: 'weight', 6: 'goal',
  7: 'experience', 8: 'frequency', 9: 'location', 10: 'care', 11: 'intensity', 12: 'motivation', 13: 'schedule',
};
export function StepArtwork() {
  const step = useContext(OnboardingArtContext);
  const { height, fontScale } = useWindowDimensions();
  if (step == null || !subjects[step]) return null;
  const artHeight = height < 750 || fontScale > 1.2 ? 40 : 64;
  return <View pointerEvents="none" style={{ alignItems: 'flex-start', marginBottom: 4 }}>
    <ContourArt subject={subjects[step]} width={artHeight * 1.6} height={artHeight} />
  </View>;
}
