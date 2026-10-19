import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import type { ShareCardData } from '@/src/features/share/cardData';
import { CARD_SIZE, DISPLAY, MONO, SAFE, type CardFormat } from '@/src/features/share/cards/parts';
import { Glows, Grain } from '@/src/features/share/cards/visuals';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const TEETH = 9; // zig-zag tear at the bottom of the slip, px per tooth

/** A gym "receipt": every exercise (or km split) itemised on a slip of till paper. */
export function ReceiptCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const c = useThemeColors().share;
  const r = c.receipt;
  const { width, height } = CARD_SIZE[format];
  const story = format === 'story';
  const slipW = story ? 290 : 262;
  const rows = data.rows.slice(0, story ? 8 : 4);
  const mono = { fontFamily: MONO, color: r.ink };
  const dashes = '-'.repeat(story ? 34 : 31);

  return (
    <View style={{ width, height, backgroundColor: c.night.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Glows width={width} height={height} a={c.night.glowA} b={c.night.glowB} />
      <Grain tone="light" width={width} height={height} />
      <View style={{ marginTop: story ? SAFE.story.top - 30 : 0, transform: [{ rotate: '-2deg' }] }}>
        <View style={[styles.slip, { width: slipW, backgroundColor: r.paper, paddingVertical: story ? 22 : 14 }]}>
          <Text style={[styles.brand, { color: r.ink }]}>FITNYX</Text>
          <Text style={[mono, styles.center, styles.small, { color: r.muted }]}>{data.kind === 'roam' ? 'ACTIVITY' : 'WORKOUT'} RECEIPT</Text>
          <Text style={[mono, styles.dash, { color: r.rule }]}>{dashes}</Text>
          <Line l={data.title.toUpperCase()} r="" mono={mono} />
          <Line l={data.date.toUpperCase()} r={data.time.toUpperCase()} mono={mono} muted={r.muted} />
          <Text style={[mono, styles.dash, { color: r.rule }]}>{dashes}</Text>
          {rows.map((row, i) => (
            <Line key={i} l={`${row.pr ? '★ ' : ''}${row.name}`} r={row.detail} mono={mono} />
          ))}
          <Text style={[mono, styles.dash, { color: r.rule }]}>{dashes}</Text>
          <View style={styles.total}>
            <Text style={[mono, styles.totalLabel]}>{data.hero.label.toUpperCase()}</Text>
            <Text style={[styles.totalValue, { color: r.ink }]}>
              {data.hero.value}
              {data.hero.unit ? ` ${data.hero.unit.toUpperCase()}` : ''}
            </Text>
          </View>
          {data.stats.map((s) => (
            <Line key={s.label} l={s.label.toUpperCase()} r={`${s.value}${s.unit ? ` ${s.unit}` : ''}`} mono={mono} muted={r.muted} />
          ))}
          {data.fact && story ? <Text style={[mono, styles.center, styles.fact]}>{data.fact}</Text> : null}
          <Barcode seed={`${data.title}${data.date}${data.hero.value}`} color={r.ink} width={slipW - 44} height={story ? 38 : 26} />
          <Text style={[mono, styles.center, styles.small]}>THANK YOU FOR SHOWING UP</Text>
          {data.badge ? <Text style={[mono, styles.center, styles.small, { color: r.muted }]}>{`${data.badge} EARNED`}</Text> : null}
        </View>
        <Svg width={slipW} height={TEETH} style={styles.teeth}>
          <Path d={zigzag(slipW)} fill={r.paper} />
        </Svg>
      </View>
    </View>
  );
}

function Line({ l, r, mono, muted }: { l: string; r: string; mono: object; muted?: string }) {
  return (
    <View style={styles.line}>
      <Text style={[mono, styles.lineText, styles.flex]} numberOfLines={1}>
        {l}
      </Text>
      {r ? <Text style={[mono, styles.lineText, muted ? { color: muted } : null]}>{r}</Text> : null}
    </View>
  );
}

function zigzag(w: number): string {
  let d = `M0,0 L${w},0`;
  for (let x = w; x > 0; x -= TEETH) d += ` L${x - TEETH / 2},${TEETH} L${Math.max(0, x - TEETH)},0`;
  return `${d} Z`;
}

/** Deterministic bars from the receipt's content — decorative, the same for the same Roam. */
function Barcode({ seed, color, width, height }: { seed: string; color: string; width: number; height: number }) {
  let h = 2166136261;
  const bars: { x: number; w: number }[] = [];
  for (let x = 0; x < width; ) {
    h = Math.imul(h ^ seed.charCodeAt(x % Math.max(1, seed.length)), 16777619) >>> 0;
    const w = 1 + (h % 3);
    if (h % 5 !== 0) bars.push({ x, w });
    x += w + 1 + ((h >> 3) % 2);
  }
  return (
    <Svg width={width} height={height} style={styles.barcode}>
      {bars.map((b) => (
        <Rect key={b.x} x={b.x} y={0} width={b.w} height={height} fill={color} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  slip: { paddingHorizontal: 22 },
  teeth: { marginTop: -0.5 },
  brand: { fontFamily: DISPLAY, fontSize: 28, letterSpacing: 3, textAlign: 'center' },
  center: { textAlign: 'center' },
  small: { fontSize: 10, letterSpacing: 1, marginTop: 2 },
  dash: { fontSize: 11, marginVertical: 6, textAlign: 'center' },
  line: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  lineText: { fontSize: 11.5 },
  flex: { flex: 1 },
  total: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 12, fontWeight: '700' },
  totalValue: { fontFamily: DISPLAY, fontSize: 26 },
  fact: { fontSize: 11, marginTop: 8 },
  barcode: { alignSelf: 'center', marginTop: 14, marginBottom: 6 },
});
