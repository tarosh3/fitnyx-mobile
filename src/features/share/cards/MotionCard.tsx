import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { ActivityArtwork, activityArt } from '@/src/features/share/cards/ActivityArtwork';
import { BigNumber, CARD_SIZE, CardFooter, CardTitle, Label, SAFE, StatRow, type CardFormat } from '@/src/features/share/cards/parts';
import { share } from '@/src/theme/colors';

/** A collectible sports print: custom activity artwork, warm ink and mint. */
export function MotionCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const n = share.night;
  const story = format === 'story';
  const safe = SAFE[format];
  const width = CARD_SIZE[format].width - safe.side * 2;
  return (
    <View
      style={[
        CARD_SIZE[format],
        styles.card,
        { backgroundColor: n.bg, paddingTop: safe.top, paddingBottom: safe.bottom, paddingHorizontal: safe.side },
      ]}
    >
      <View style={styles.header}>
        <Label color={n.accent}>{`${data.kicker} / COMPLETE`}</Label>
        <Label color={n.muted} size={8}>
          {data.date.toUpperCase()}
        </Label>
      </View>
      <View style={{ marginTop: story ? 22 : 16 }}>
        <CardTitle title={data.title} color={n.text} size={story ? 36 : 29} />
      </View>
      <View style={styles.art}>
        <ActivityArtwork
          activity={activityArt(data)}
          width={width}
          height={story ? 176 : 116}
          ink={n.text}
          accent={n.accent}
          background={n.bg}
        />
      </View>
      <Label color={n.accent} size={9}>
        {data.hero.label.toUpperCase()}
      </Label>
      <BigNumber stat={data.hero} size={story ? 104 : 84} color={n.text} unitColor={n.accent} />
      <View style={[styles.rule, { backgroundColor: n.faint }]} />
      <StatRow stats={data.stats} color={n.text} muted={n.muted} rule={n.faint} />
      <View style={{ marginTop: story ? 24 : 20 }}>
        <CardFooter data={data} color={n.accent} muted={n.muted} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  art: { flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center' },
  rule: { height: 1, marginTop: 12, marginBottom: 16 },
});
