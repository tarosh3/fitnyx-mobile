import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { BigNumber, CARD_SIZE, Label, Pill, SAFE, StatRow, Wordmark, type CardFormat } from '@/src/features/share/cards/parts';
import { NeonRoute, SetBars } from '@/src/features/share/cards/visuals';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** The user's own photo under a cinematic scrim, stats along the bottom. */
export function PhotoCard({ data, format, photoUri }: { data: ShareCardData; format: CardFormat; photoUri?: string | null }) {
  const c = useThemeColors().share;
  const ph = c.photo;
  const { width, height } = CARD_SIZE[format];
  const safe = SAFE[format];
  const story = format === 'story';
  const shadow = { textShadowColor: c.sticker.shadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };

  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: ph.placeholderB }}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[ph.placeholderA, ph.placeholderB]} style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <ImagePlus size={40} color={ph.muted} />
          <Text style={[styles.placeholderText, { color: ph.muted }]}>Choose a photo below</Text>
        </LinearGradient>
      )}
      <LinearGradient colors={[ph.scrim, ph.clear]} locations={[0, 1]} style={[styles.topScrim, { height: height * 0.24 }]} />
      <LinearGradient colors={[ph.clear, ph.scrim]} locations={[0, 0.72]} style={[styles.bottomScrim, { height: height * (story ? 0.62 : 0.72) }]} />

      <View style={[styles.body, { paddingTop: safe.top, paddingBottom: safe.bottom, paddingHorizontal: safe.side }]}>
        <View style={styles.header}>
          <Wordmark color={ph.text} accent={c.night.accent} shadow={shadow} />
          <Label color={ph.muted} style={shadow}>{data.date.toUpperCase()}</Label>
        </View>
        <View style={styles.spacer} />
        {data.route ? (
          <View style={styles.route}>
            <NeonRoute route={data.route} width={story ? 120 : 92} height={story ? 86 : 62} colors={c.route} dot={ph.text} stroke={2.5} pad={6} />
          </View>
        ) : data.bars?.length ? (
          <View style={styles.route}>
            <SetBars loads={data.bars} width={story ? 130 : 100} height={story ? 60 : 44} colors={c.route} />
          </View>
        ) : null}
        <Label color={c.night.accent} size={10} style={[shadow, styles.kicker]}>{`${data.kicker} · ${data.title.toUpperCase()}`}</Label>
        <BigNumber stat={data.hero} size={story ? 92 : 68} color={ph.text} unitColor={c.night.accent} shadow={shadow} />
        {data.fact ? <Text style={[styles.fact, { color: ph.muted }, shadow]}>{data.fact}</Text> : null}
        <View style={[styles.rule, { backgroundColor: c.night.faint }]} />
        <StatRow stats={data.stats} color={ph.text} muted={ph.muted} rule={c.night.faint} shadow={shadow} />
        <View style={styles.footer}>
          {data.badge ? <Pill text={data.badge} color={ph.text} bg={c.night.faint} border={c.night.faint} /> : <View />}
          <Label color={ph.muted} size={8.5} style={shadow}>TRACKED ON FITNYX</Label>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { marginBottom: 5 },
  body: { flex: 1 },
  // Icon + hint sit in the empty upper third, clear of the stats.
  placeholder: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: '34%', gap: 10 },
  placeholderText: { fontFamily: type.weight.semibold, fontSize: 14 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { flex: 1 },
  route: { alignSelf: 'flex-start', marginBottom: 10 },
  fact: { fontFamily: type.weight.semibold, fontSize: 13 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
});
