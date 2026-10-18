import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { BigNumber, CARD_SIZE, Label, StatRow, Wordmark, type CardFormat } from '@/src/features/share/cards/parts';
import { NeonRoute, SetBars } from '@/src/features/share/cards/visuals';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/**
 * A transparent PNG to drop on a selfie or story: white type with a soft
 * shadow so it reads on any photo. Nothing but the content is painted.
 */
export function StickerCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const c = useThemeColors().share;
  const s = c.sticker;
  const { width, height } = CARD_SIZE[format];
  const story = format === 'story';
  const shadow = { textShadowColor: s.shadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 }}>
      <View style={styles.stack}>
        <Wordmark color={s.text} accent={c.night.accent} size={16} shadow={shadow} />
        {data.route ? (
          <NeonRoute route={data.route} width={width - 68} height={story ? 190 : 110} colors={[s.text, c.route[0], c.route[1]]} dot={s.text} stroke={4} />
        ) : (
          <SetBars loads={data.bars ?? []} width={width - 68} height={story ? 120 : 76} colors={[s.text, c.route[0], c.route[1]]} />
        )}
        <Label color={s.muted} size={10} style={[shadow, styles.kicker]}>{`${data.kicker} · ${data.title.toUpperCase()}`}</Label>
        <BigNumber stat={data.hero} size={story ? 96 : 72} color={s.text} unitColor={s.text} shadow={shadow} />
        <View style={styles.stats}>
          <StatRow stats={data.stats} color={s.text} muted={s.muted} rule={s.muted} shadow={shadow} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { marginBottom: 5 },
  stack: { alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  stats: { alignSelf: 'stretch', marginTop: 4 },
});
