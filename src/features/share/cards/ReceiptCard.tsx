import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';

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
import { share } from '@/src/theme/colors';
import { type } from '@/src/styles/tokens';

/** A collectible session log: numbered efforts, clear totals and real PRs. */
export function ReceiptCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const r = share.receipt;
  const n = share.night;
  const story = format === 'story';
  const safe = SAFE[format];
  const rows = data.rows.slice(0, story ? 5 : 3);
  const remaining = Math.max(0, (data.rowCount ?? data.rows.length) - rows.length);
  return (
    <View style={[CARD_SIZE[format], { backgroundColor: n.bg, paddingHorizontal: 18, paddingTop: safe.top, paddingBottom: safe.bottom }]}>
      <View style={[styles.sheet, { backgroundColor: r.paper }]}>
        <View style={styles.header}>
          <Label color={r.ink} size={9}>
            THE SESSION LOG
          </Label>
          <ArrowUpRight size={18} color={r.ink} />
        </View>
        <View style={[styles.date, { borderColor: r.ink }]}>
          <Label color={r.muted} size={7}>
            {data.date.toUpperCase()}
          </Label>
          <Label color={r.muted} size={7}>{`${data.kicker} / ${data.time.toUpperCase()}`}</Label>
        </View>
        <CardTitle title={data.title} color={r.ink} size={story ? 31 : 25} />
        <View style={{ marginTop: 10 }}>
          <Label color={r.muted} size={8}>
            {data.hero.label.toUpperCase()}
          </Label>
          <BigNumber stat={data.hero} size={story ? 58 : 48} color={r.ink} unitColor={r.ink} />
        </View>
        <View style={[styles.columns, { borderColor: r.rule }]}>
          <Label color={r.muted} size={7}>
            {data.kind === 'roam' ? 'KILOMETRE' : 'EXERCISE'}
          </Label>
          <Label color={r.muted} size={7}>
            {data.kind === 'roam' ? 'SPLIT TIME' : 'BEST SET'}
          </Label>
        </View>
        <View style={styles.rows}>
          {rows.map((row, i) => (
            <View key={i} style={[styles.row, { borderColor: r.rule, paddingVertical: story ? 6 : 5 }]}>
              <Text allowFontScaling={false} style={[styles.index, { color: r.muted }]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.name, { color: r.ink }]}>
                {row.name}
              </Text>
              {row.pr ? (
                <View style={[styles.pr, { backgroundColor: n.panel }]}>
                  <Text allowFontScaling={false} style={[styles.prText, { color: n.ink }]}>
                    PR
                  </Text>
                </View>
              ) : null}
              <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={[styles.detail, { color: r.ink }]}>
                {row.detail}
              </Text>
            </View>
          ))}
          {remaining > 0 ? (
            <Text
              allowFontScaling={false}
              style={[styles.more, { color: r.muted }]}
            >{`+ ${remaining} more ${data.kind === 'roam' ? (remaining === 1 ? 'split' : 'splits') : remaining === 1 ? 'exercise' : 'exercises'}`}</Text>
          ) : null}
          {!rows.length ? (
            <Text allowFontScaling={false} style={[styles.more, { color: r.muted }]}>
              Every effort counts.
            </Text>
          ) : null}
        </View>
        <View style={[styles.stats, { borderColor: r.ink }]}>
          <StatRow stats={data.stats} color={r.ink} muted={r.muted} rule={r.rule} />
        </View>
        {story ? (
          <View style={styles.complete}>
            <Completed color={share.paper.accent} label="EFFORT, ON THE RECORD." />
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <CardFooter data={data} color={n.accent} muted={n.muted} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, paddingBottom: 10, marginTop: 8, marginBottom: 12 },
  columns: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 7, marginTop: 10 },
  rows: { flex: 1 },
  row: { flexDirection: 'row', gap: 7, alignItems: 'center', borderBottomWidth: 1 },
  index: { fontFamily: type.weight.medium, fontSize: type.size.micro },
  name: { flex: 1, fontFamily: type.weight.semibold, fontSize: 11 },
  detail: { maxWidth: '37%', fontFamily: type.weight.medium, fontSize: 11 },
  pr: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  prText: { fontFamily: type.weight.extrabold, fontSize: 7 },
  more: { fontFamily: type.weight.medium, fontSize: type.size.micro, marginTop: 7 },
  stats: { borderTopWidth: 2, paddingTop: 10, marginTop: 8 },
  complete: { alignItems: 'center', marginTop: 10 },
  footer: { marginTop: 16, paddingHorizontal: 8 },
});
