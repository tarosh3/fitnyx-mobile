import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useAppConfig } from '@/src/features/appConfig/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { selectCompletionArtwork } from './artwork';

const bundled = {
  workout: { hero: require('@/assets/images/completion/workout-celebration.png'), accent: require('@/assets/images/completion/achievement.png') },
  roam: { hero: require('@/assets/images/completion/roam-journey.png'), accent: require('@/assets/images/completion/achievement.png') },
};

export function CompletionArtwork({ screen, slot = 'hero', seed = screen }: {
  screen: 'workout' | 'roam'; slot?: 'hero' | 'accent'; seed?: string;
}) {
  const config = useAppConfig();
  const { theme } = useTheme();
  const selected = selectCompletionArtwork(config?.completion_artwork, screen, slot, seed);
  const uri = selected?.[theme === 'dark' ? 'darkUrl' : 'lightUrl'];
  // Keying the loader prevents a late failure from an old theme/URL replacing new art.
  return <ArtworkImage key={uri ?? `${screen}-${slot}`} uri={uri} fallback={bundled[screen][slot]} />;
}

function ArtworkImage({ uri, fallback }: { uri?: string; fallback: number }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.frame} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!loaded || failed ? <Image source={fallback} style={styles.image} resizeMode="contain" fadeDuration={0} /> : null}
      {uri && !failed ? <Image source={{ uri, cache: 'default' }} style={[styles.image, !loaded && styles.hidden]} resizeMode="contain" fadeDuration={0} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} /> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: { width: '100%', height: '100%' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  hidden: { opacity: 0 },
});
