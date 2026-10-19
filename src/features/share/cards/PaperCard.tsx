import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { BigNumber, CARD_SIZE, CardFooter, CardTitle, Label, SAFE, StatRow, type CardFormat } from '@/src/features/share/cards/parts';
import { RoutePanel, SessionHighlight } from '@/src/features/share/cards/visuals';
import { share } from '@/src/theme/colors';
import { type } from '@/src/styles/tokens';

/** A personal sporting journal: warm paper, generous type and fine rules. */
export function PaperCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const p = share.paper;
  const story = format === 'story';
  const safe = SAFE[format];
  const width = CARD_SIZE[format].width - safe.side * 2;
  return (
    <View
      style={[
        CARD_SIZE[format],
        styles.card,
        { backgroundColor: p.bg, paddingHorizontal: safe.side, paddingTop: safe.top, paddingBottom: safe.bottom },
      ]}
    >
      <View style={[styles.header, { borderColor: p.ink }]}>
        <Label color={p.ink} size={10}>
          THE DAILY EFFORT
        </Label>
        <Label color={p.muted} size={8}>
          {data.date.toUpperCase()}
        </Label>
      </View>
      <View style={{ marginTop: story ? 20 : 14, gap: 8 }}>
        <Label color={p.accent} size={8}>{`${data.kicker} / ${data.time.toUpperCase()}`}</Label>
        <CardTitle title={data.title} color={p.ink} size={story ? 49 : 37} lines={1} />
      </View>
      <View style={styles.visual}>
        {data.kind === 'roam' ? (
          <RoutePanel data={data} width={width} height={story ? 150 : 80} color={p.accent} muted={p.muted} background={p.bg} />
        ) : (
          <View style={{ alignSelf: 'stretch' }}>
            <SessionHighlight data={data} color={p.ink} muted={p.accent} rule={p.faint} compact={!story} />
          </View>
        )}
      </View>
      <Label color={p.muted} size={8}>
        {data.hero.label.toUpperCase()}
      </Label>
      <BigNumber stat={data.hero} size={story ? 91 : 72} color={p.ink} unitColor={p.accent} />
      {data.fact && story ? (
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.fact, { color: p.muted }]}>
          {data.fact}
        </Text>
      ) : null}
      <View style={[styles.stats, { borderColor: p.ink }]}>
        <StatRow stats={data.stats} color={p.ink} muted={p.muted} rule={p.faint} />
      </View>
      <CardFooter data={data} color={p.ink} muted={p.muted} />
    </View>
  );
}
const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, paddingBottom: 12 },
  visual: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 0, marginVertical: 8 },
  fact: { fontFamily: type.weight.regular, fontSize: 11, marginTop: 3 },
  stats: { borderTopWidth: 1, paddingTop: 14, marginTop: 14, marginBottom: 20 },
});
