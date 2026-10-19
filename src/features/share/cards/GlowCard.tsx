import React from 'react';
import { StyleSheet, View } from 'react-native';

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
import { RoutePanel, SessionHighlight, SetBars } from '@/src/features/share/cards/visuals';
import { share } from '@/src/theme/colors';

/** The signature poster: mint stock, oversized ink, a dark results band. */
export function GlowCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const n = share.night;
  const story = format === 'story';
  const safe = SAFE[format];
  const width = CARD_SIZE[format].width - safe.side * 2;
  const roam = data.kind === 'roam';
  return (
    <View style={[CARD_SIZE[format], styles.card, { backgroundColor: n.bg }]}>
      <View style={[styles.poster, { backgroundColor: n.panel, paddingHorizontal: safe.side, paddingTop: safe.top }]}>
        <View style={styles.header}>
          <Label color={n.ink}>{`FITNYX / ${data.kicker}`}</Label>
          <Label color={n.panelMuted} size={8}>
            {data.date.toUpperCase()}
          </Label>
        </View>
        <View style={{ marginTop: story ? 22 : 14 }}>
          <CardTitle title={data.title} color={n.ink} size={story ? 36 : 29} />
        </View>
        <View style={{ marginTop: story ? 18 : 12 }}>
          <Label color={n.panelMuted}>{data.hero.label.toUpperCase()}</Label>
          <BigNumber stat={data.hero} size={story ? 112 : 88} color={n.ink} unitColor={n.ink} />
        </View>
        <View style={styles.art}>
          {roam ? (
            <RoutePanel data={data} width={width} height={story ? 122 : 76} color={n.ink} muted={n.panelMuted} background={n.panel} />
          ) : (
            <View style={styles.workoutArt}>
              <SetBars loads={data.bars ?? []} width={width} height={story ? 50 : 34} color={n.ink} muted={n.panelMuted} />
              <View style={styles.header}>
                <Label color={n.panelMuted} size={7}>
                  EVERY SET COUNTS.
                </Label>
                <Completed color={n.ink} />
              </View>
            </View>
          )}
        </View>
        {roam ? (
          <View style={[styles.header, styles.routeCaption]}>
            <Completed color={n.ink} label="ROAM COMPLETE" />
            <Label color={n.panelMuted} size={7}>
              YOUR ROUTE. YOUR EFFORT.
            </Label>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: safe.side, paddingTop: story ? 20 : 16, paddingBottom: safe.bottom }}>
        <StatRow stats={data.stats} color={n.text} muted={n.muted} rule={n.faint} />
        {!roam && story ? (
          <View style={styles.highlight}>
            <SessionHighlight data={data} color={n.text} muted={n.accent} rule={n.faint} compact />
          </View>
        ) : null}
        <View style={{ marginTop: story ? 20 : 16 }}>
          <CardFooter data={data} color={n.accent} muted={n.muted} />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  poster: { flex: 1, paddingBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  art: { flex: 1, minHeight: 0, justifyContent: 'center' },
  workoutArt: { gap: 9 },
  routeCaption: { marginTop: 4 },
  highlight: { marginTop: 16 },
});
