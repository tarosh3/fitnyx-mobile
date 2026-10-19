import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import {
  BigNumber,
  CARD_SIZE,
  CardFooter,
  CardTitle,
  Completed,
  Label,
  SAFE,
  StatRow,
  type CardFormat,
} from '@/src/features/share/cards/parts';
import { RouteArt } from '@/src/features/share/cards/visuals';
import { share } from '@/src/theme/colors';
import { type } from '@/src/styles/tokens';

/** The photo stays the subject; the lower scrim protects the result's contrast. */
export function PhotoCard({
  data,
  format,
  photoUri,
  onPhotoLoad,
  onPhotoError,
}: {
  data: ShareCardData;
  format: CardFormat;
  photoUri?: string | null;
  onPhotoLoad?: () => void;
  onPhotoError?: () => void;
}) {
  const p = share.photo;
  const story = format === 'story';
  const safe = SAFE[format];
  const { width, height } = CARD_SIZE[format];
  return (
    <View style={{ width, height, backgroundColor: p.placeholderB, overflow: 'hidden' }}>
      {photoUri ? (
        <Image
          key={photoUri}
          source={{ uri: photoUri }}
          onLoad={onPhotoLoad}
          onError={onPhotoError}
          style={[StyleSheet.absoluteFill, { width: undefined, height: undefined }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: p.placeholderA, paddingTop: story ? 135 : 85 }]}>
          <ImagePlus size={30} color={p.text} strokeWidth={1.5} />
          <Text allowFontScaling={false} style={[styles.placeholderTitle, { color: p.text }]}>
            Your moment goes here.
          </Text>
          <Text allowFontScaling={false} style={[styles.placeholderText, { color: p.muted }]}>
            Add a photo to make it yours
          </Text>
        </View>
      )}
      <LinearGradient colors={[p.scrim, p.clear]} style={[styles.topScrim, { height: 140 }]} />
      <LinearGradient
        colors={[p.clear, p.scrim, p.scrim]}
        locations={[0, 0.5, 1]}
        style={[styles.bottomScrim, { height: height * 0.72 }]}
      />
      <View style={[styles.body, { paddingTop: safe.top, paddingBottom: safe.bottom, paddingHorizontal: safe.side }]}>
        <View style={styles.header}>
          <Completed color={p.text} />
          <Label color={p.text} size={8}>
            {data.date.toUpperCase()}
          </Label>
        </View>
        <View style={styles.spacer} />
        {story && (data.route?.length ?? 0) > 1 ? (
          <View style={styles.route}>
            <RouteArt route={data.route!} width={100} height={85} color={p.text} background={p.placeholderB} stroke={2.5} />
          </View>
        ) : null}
        <Label color={share.night.accent} size={8}>{`${data.kicker} / ${data.hero.label.toUpperCase()}`}</Label>
        <BigNumber stat={data.hero} size={story ? 96 : 78} color={p.text} unitColor={p.text} />
        <CardTitle title={data.title} color={p.text} size={story ? 27 : 23} />
        <View style={[styles.stats, { borderColor: share.night.muted }]}>
          <StatRow stats={data.stats} color={p.text} muted={p.muted} rule={share.night.muted} />
        </View>
        <CardFooter data={data} color={p.text} muted={p.muted} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  body: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  placeholder: { alignItems: 'center', gap: 9 },
  placeholderTitle: { fontFamily: type.weight.semibold, fontSize: 17 },
  placeholderText: { fontFamily: type.weight.regular, fontSize: 11 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  spacer: { flex: 1 },
  route: { marginBottom: 12 },
  stats: { borderTopWidth: 1, paddingTop: 14, marginTop: 18, marginBottom: 22 },
});
