import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { BigNumber, CARD_SIZE, Label, StatRow, Wordmark, type CardFormat } from '@/src/features/share/cards/parts';
import { RouteArt } from '@/src/features/share/cards/visuals';
import { share } from '@/src/theme/colors';
import { type } from '@/src/styles/tokens';

/** Transparent artwork for layering over a story or selfie. */
export function StickerCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const s = share.sticker;
  const story = format === 'story';
  const shadow = { textShadowColor: s.shadow, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 };
  return (
    <View style={[CARD_SIZE[format], styles.card]}>
      <View style={styles.stack}>
        <Label color={s.text} size={10} style={shadow}>{`${data.kicker} / COMPLETE`}</Label>
        {(data.route?.length ?? 0) > 1 ? (
          <RouteArt route={data.route!} width={280} height={story ? 165 : 98} color={s.text} background="transparent" stroke={4} />
        ) : (
          <Text allowFontScaling={false} style={[styles.headline, { color: s.text }, shadow]}>
            WORK PUT IN.
          </Text>
        )}
        <View style={styles.metric}>
          <BigNumber stat={data.hero} size={story ? 100 : 82} color={s.text} unitColor={s.text} shadow={shadow} />
          <Label color={s.text} size={8} style={shadow}>
            {data.hero.label.toUpperCase()}
          </Label>
        </View>
        <View style={styles.stats}>
          <StatRow stats={data.stats} color={s.text} muted={s.text} rule={s.text} shadow={shadow} />
        </View>
        <Wordmark color={s.text} accent={s.text} shadow={shadow} size={16} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { justifyContent: 'center', paddingHorizontal: 30 },
  stack: { alignItems: 'center', gap: 16 },
  metric: { alignItems: 'center', alignSelf: 'stretch' },
  headline: { fontFamily: type.weight.extrabold, fontSize: 28, letterSpacing: -1, marginTop: 8 },
  stats: { alignSelf: 'stretch', marginTop: 4, marginBottom: 4 },
});
