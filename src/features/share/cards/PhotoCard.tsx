import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ShareCardData } from '../cardData';
import { BigNumber, CARD_SIZE, CardTitle, Label, SAFE, StatRow, type CardFormat } from './parts';
import { RouteArt } from './visuals';
import { type ArtworkCallbacks, DoodleArt, HandNote, SKETCH as s, Scribble, SketchFooter, SketchHeader, EffortMark } from './sketch';

/** A handwritten dedication over the user's own photo. */
export function PhotoCard({
  data,
  format,
  photoUri,
  onPhotoLoad,
  onPhotoError,
  onArtworkLoad,
  onArtworkError,
}: {
  data: ShareCardData;
  format: CardFormat;
  photoUri?: string | null;
  onPhotoLoad?: () => void;
  onPhotoError?: () => void;
} & ArtworkCallbacks) {
  const story = format === 'story';
  const safe = SAFE[format];
  const ink = photoUri ? s.white : s.ink;
  const muted = photoUri ? s.photoMuted : s.muted;
  return (
    <View style={[CARD_SIZE[format], { backgroundColor: s.paper, overflow: 'hidden' }]}>
      {photoUri ? (
        <>
          <Image
            key={photoUri}
            source={{ uri: photoUri }}
            onLoad={onPhotoLoad}
            onError={onPhotoError}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, { width: undefined, height: undefined }]}
          />
          <LinearGradient
            colors={['rgba(8,18,13,0.48)', 'rgba(8,18,13,0.05)', 'rgba(8,18,13,0.88)', 'rgba(8,18,13,0.96)']}
            locations={[0, 0.28, 0.64, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
      <View style={{ flex: 1, paddingHorizontal: safe.side, paddingTop: safe.top, paddingBottom: safe.bottom }}>
        <SketchHeader data={data} color={ink} />
        <View style={{ marginTop: 14 }}>
          <HandNote color={ink} size={story ? 29 : 24}>
            a good day to show up.
          </HandNote>
        </View>
        <View style={{ flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center' }}>
          {!photoUri ? (
            <>
              <DoodleArt onArtworkLoad={onArtworkLoad} onArtworkError={onArtworkError} data={data} height={story ? 130 : 78} />
              <HandNote size={18}>your photo belongs here.</HandNote>
            </>
          ) : (
            <View style={{ alignSelf: 'flex-end', transform: [{ rotate: '10deg' }] }}>
              <EffortMark color={ink} size={44} />
            </View>
          )}
        </View>
        {photoUri && story && (data.route?.length ?? 0) > 1 ? (
          <View style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
            <RouteArt route={data.route!} width={100} height={74} color={ink} background="transparent" stroke={3} />
          </View>
        ) : null}
        <Label color={photoUri ? s.mint : s.green} size={8}>
          {data.hero.label.toUpperCase()}
        </Label>
        <BigNumber stat={data.hero} size={story ? 86 : 64} color={ink} unitColor={ink} />
        <CardTitle title={data.title} color={ink} size={story ? 32 : 27} />
        <Scribble color={ink} />
        <View style={{ paddingVertical: 12 }}>
          <StatRow stats={data.stats} color={ink} muted={muted} rule={photoUri ? s.photoRule : s.line} />
        </View>
        <View style={{ marginTop: story ? 12 : 6 }}>
          <SketchFooter color={ink} muted={muted} />
        </View>
      </View>
    </View>
  );
}
