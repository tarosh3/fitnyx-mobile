import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { BigNumber, CARD_SIZE, DISPLAY, Label, SAFE, StatRow, Wordmark, type CardFormat } from '@/src/features/share/cards/parts';
import { Grain, Measured, NeonRoute, SetBars } from '@/src/features/share/cards/visuals';
import { Highlight } from '@/src/features/share/cards/RowList';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** Editorial: warm paper, black ink, a huge condensed title — a magazine page. */
export function PaperCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const p = useThemeColors().share.paper;
  const { width, height } = CARD_SIZE[format];
  const safe = SAFE[format];
  const story = format === 'story';

  return (
    <View style={{ width, height, backgroundColor: p.bg, overflow: 'hidden' }}>
      <Grain tone="dark" width={width} height={height} />
      <View style={[styles.body, { paddingTop: safe.top, paddingBottom: safe.bottom, paddingHorizontal: safe.side }]}>
        <View style={styles.header}>
          <Wordmark color={p.ink} accent={p.accent} />
          <Label color={p.muted}>{data.date.toUpperCase()}</Label>
        </View>
        <View style={[styles.rule, { backgroundColor: p.ink }]} />

        <Label color={p.accent} size={10}>{`${data.kicker} · ${data.time.toUpperCase()}`}</Label>
        <Text style={[styles.title, { color: p.ink, fontSize: story ? 46 : 34, lineHeight: story ? 50 : 38 }]} numberOfLines={2}>
          {data.title.toUpperCase()}
        </Text>

        <View style={styles.visual}>
          <Measured>
            {(w, h) =>
              data.route ? (
                <NeonRoute route={data.route} width={w} height={h} colors={[p.routeA, p.routeA, p.routeB]} glow={false} stroke={story ? 3.5 : 3} dot={p.bg} />
              ) : (
                <SetBars loads={data.bars ?? []} width={w} height={Math.min(h, story ? 130 : 80)} colors={[p.routeB, p.routeA, p.routeA]} glow={false} />
              )
            }
          </Measured>
          {data.route ? null : <Highlight rows={data.rows} color={p.accent} />}
        </View>

        <View style={styles.heroRow}>
          <View style={styles.flex}>
            <Label style={styles.heroLabel} color={p.muted}>{data.hero.label.toUpperCase()}</Label>
            <BigNumber stat={data.hero} size={story ? 96 : 70} color={p.ink} unitColor={p.accent} />
          </View>
        </View>
        {data.fact ? <Text style={[styles.fact, { color: p.accent }]}>{data.fact}</Text> : null}
        <View style={[styles.thin, { backgroundColor: p.faint }]} />
        <StatRow stats={data.stats} color={p.ink} muted={p.muted} rule={p.faint} />
        <View style={styles.footer}>
          <Label color={p.ink} size={8.5}>{data.badge ? `${data.badge}  ·  ` : ''}FITNYX</Label>
          <Label color={p.muted} size={8.5}>SHOW UP. GET STRONGER.</Label>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroLabel: { marginTop: 10, marginBottom: 5 },
  body: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rule: { height: 2, marginTop: 12, marginBottom: 14 },
  title: { fontFamily: DISPLAY, letterSpacing: 0.3, marginTop: 4, includeFontPadding: false },
  visual: { flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end' },
  fact: { fontFamily: type.weight.semibold, fontSize: 13 },
  thin: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
});
