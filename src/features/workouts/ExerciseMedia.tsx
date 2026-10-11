import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

import { getCachedVideoUri } from '@/src/lib/offline/videoCache';

interface ExerciseMediaProps {
  url?: string;
  title: string;
  style?: StyleProp<ImageStyle>;
  /** Whether the video should auto-play. Defaults to true. */
  autoPlay?: boolean;
}

export function ExerciseMedia({ url, title, style, autoPlay = true }: ExerciseMediaProps) {
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

  const isVideo = resolvedUrl
    ? resolvedUrl.toLowerCase().endsWith('.mp4') ||
      (url?.toLowerCase().endsWith('.mp4') && resolvedUrl.startsWith('file://'))
    : false;

  if (!resolvedUrl) return null;

  // Only video media gets a player: a native player per image tile (e.g. every
  // row of the exercise list) costs memory and makes scrolling janky.
  if (isVideo) {
    return <ExerciseVideo url={resolvedUrl} style={style} autoPlay={autoPlay} />;
  }

  return <Image source={{ uri: resolvedUrl }} accessibilityLabel={title} style={style} />;
}

function ExerciseVideo({ url, style, autoPlay }: { url: string; style?: StyleProp<ImageStyle>; autoPlay: boolean }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    if (autoPlay) p.play();
  });

  return <VideoView player={player} style={style as any} contentFit="cover" nativeControls={!autoPlay} />;
}
