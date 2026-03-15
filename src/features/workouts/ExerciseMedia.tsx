import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

import { getCachedVideoUri } from '@/src/lib/offline/videoCache';

interface ExerciseMediaProps {
  url?: string;
  title: string;
  style?: StyleProp<ImageStyle>;
}

export function ExerciseMedia({ url, title, style }: ExerciseMediaProps) {
  const [resolvedUrl, setResolvedUrl] = useState(url);

  useEffect(() => {
    if (!url) return;
    if (!url.toLowerCase().endsWith('.mp4')) {
      setResolvedUrl(url);
      return;
    }

    // Check for locally cached video
    getCachedVideoUri(url).then((localUri) => {
      setResolvedUrl(localUri || url);
    }).catch(() => {
      setResolvedUrl(url);
    });
  }, [url]);

  if (!resolvedUrl) return null;

  const isVideo = resolvedUrl.toLowerCase().endsWith('.mp4') ||
    (url?.toLowerCase().endsWith('.mp4') && resolvedUrl.startsWith('file://'));

  if (isVideo) {
    const player = useVideoPlayer(resolvedUrl, (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    });

    return (
      <VideoView
        player={player}
        style={style as any}
        contentFit="cover"
        nativeControls={false}
      />
    );
  }

  return <Image source={{ uri: resolvedUrl }} accessibilityLabel={title} style={style} />;
}
