import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface ExerciseMediaProps {
  url?: string;
  title: string;
  style?: StyleProp<ImageStyle>;
}

export function ExerciseMedia({ url, title, style }: ExerciseMediaProps) {
  if (!url) return null;

  const isVideo = url.toLowerCase().endsWith('.mp4');

  if (isVideo) {
    const player = useVideoPlayer(url, (player) => {
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

  return <Image source={{ uri: url }} accessibilityLabel={title} style={style} />;
}
