import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { BigNumber, CARD_SIZE, Label, Pill, SAFE, StatRow, Wordmark, type CardFormat } from '@/src/features/share/cards/parts';
import { Glows, Grain, Measured, NeonRoute, SetBars } from '@/src/features/share/cards/visuals';
import { Highlight } from '@/src/features/share/cards/RowList';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** Flagship look: near-black, brand light blooms, film grain, neon route, giant Anton number. */
export function GlowCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const n = useThemeColors().share.night;
  const route = useThemeColors().share.route;
  const { width, height } = CARD_SIZE[format];
  const safe = SAFE[format];
  const story = format === 'story';

  return (
    <View style={{ width, height, backgroundColor: n.bg, overflow: 'hidden' }}>
      <Glows width={width} height={height} a={n.glowA} b={n.glowB} />
      <Grain tone="light" width={width} height={height} />
      <View style={[styles.body, { paddingTop: safe.top, paddingBottom: safe.bottom, paddingHorizontal: safe.side }]}>
        <View style={styles.header}>
          <Wordmark color={n.text} accent={n.accent} />
          <Label color={n.muted}>{`${data.date} · ${data.time}`.toUpperCase()}</Label>
        </View>

        <View style={styles.titleBlock}>
          <Label color={n.accent} size={10}>{data.kicker}</Label>
          <Text style={[styles.title, { color: n.text }]} numberOfLines={1}>
            {data.title}
          </Text>
        </View>

        <View style={styles.visual}>
          <Measured>
            {(w, h) =>
              data.route ? (
                <NeonRoute route={data.route} width={w} height={h} colors={route} dot={n.bg} stroke={story ? 4 : 3} />
              ) : (
                <SetBars loads={data.bars ?? []} width={w} height={Math.min(h, story ? 150 : 100)} colors={route} />
              )
            }
          </Measured>
          {data.route ? null : <Highlight rows={data.rows} color={n.accent} />}
        </View>

        <Label style={styles.heroLabel} color={n.muted}>{data.hero.label.toUpperCase()}</Label>
        <BigNumber stat={data.hero} size={story ? 104 : 76} color={n.text} unitColor={n.accent} />
        {data.fact ? <Text style={[styles.fact, { color: n.accent }]}>{data.fact}</Text> : null}

        <View style={[styles.rule, { backgroundColor: n.faint }]} />
        <StatRow stats={data.stats} color={n.text} muted={n.muted} rule={n.faint} />

        <View style={styles.footer}>
          {data.badge ? <Pill text={data.badge} color={n.accent} bg={n.faint} border={n.faint} /> : <View />}
          <Label color={n.muted} size={8.5}>TRACKED ON FITNYX</Label>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroLabel: { marginTop: 10, marginBottom: 5 },
  body: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock: { marginTop: 18, gap: 4 },
  title: { fontFamily: type.weight.extrabold, fontSize: 21, letterSpacing: -0.3 },
  visual: { flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 8 },
  fact: { fontFamily: type.weight.semibold, fontSize: 13, marginTop: 2 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
});
