import React from 'react';
import { Text, View } from 'react-native';
import type { ShareCardData } from '../cardData';
import { BigNumber, CARD_SIZE, CardTitle, Label, SAFE, StatRow, type CardFormat } from './parts';
import { HAND, HandNote, SKETCH as s, Scribble, SketchFooter, EffortMark } from './sketch';
import { type } from '@/src/styles/tokens';

/** A little proof-of-effort receipt, with actual exercises or splits. */
export function ReceiptCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const story = format === 'story';
  const safe = SAFE[format];
  const rows = data.rows.slice(0, story ? 5 : 3);
  const remaining = Math.max(0, (data.rowCount ?? data.rows.length) - rows.length);
  return (
    <View
      style={[
        CARD_SIZE[format],
        { backgroundColor: s.desk, paddingHorizontal: 22, paddingTop: safe.top, paddingBottom: safe.bottom, overflow: 'hidden' },
      ]}
    >
      <View style={{ flex: 1, backgroundColor: s.paper, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <HandNote color={s.ink} size={story ? 27 : 23}>
            proof I showed up.
          </HandNote>
          <EffortMark size={27} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 }}>
          <Label color={s.muted} size={7}>
            {data.date.toUpperCase()}
          </Label>
          <Label color={s.muted} size={7}>
            {data.kicker}
          </Label>
        </View>
        <Scribble width={280} />
        <CardTitle title={data.title} color={s.ink} size={story ? 31 : 25} />
        <View style={{ marginTop: 6 }}>
          <Label color={s.green} size={7}>
            {data.hero.label.toUpperCase()}
          </Label>
          <BigNumber stat={data.hero} size={story ? 59 : 43} color={s.ink} unitColor={s.green} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderStyle: 'dashed',
            borderColor: s.line,
            paddingVertical: 6,
          }}
        >
          <Label color={s.muted} size={7}>
            {data.kind === 'roam' ? 'KILOMETRE' : 'EXERCISE'}
          </Label>
          <Label color={s.muted} size={7}>
            {data.kind === 'roam' ? 'SPLIT TIME' : 'BEST SET'}
          </Label>
        </View>
        <View style={{ flex: 1, minHeight: rows.length * (story ? 31 : 25) + (remaining > 0 ? 23 : 0) }}>
          {rows.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minHeight: story ? 31 : 25,
                borderBottomWidth: 0.7,
                borderColor: s.line,
              }}
            >
              <Text allowFontScaling={false} style={{ fontFamily: HAND, fontSize: 14, color: s.green }}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={{ flex: 1, fontFamily: type.weight.medium, fontSize: 10, color: s.ink }}
              >
                {row.name}
              </Text>
              {row.pr ? (
                <Text allowFontScaling={false} style={{ fontFamily: HAND, fontSize: 12, color: s.green }}>
                  PR!
                </Text>
              ) : null}
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ maxWidth: '36%', fontFamily: type.weight.semibold, fontSize: 11, color: s.ink }}
              >
                {row.detail}
              </Text>
            </View>
          ))}
          {remaining > 0 ? (
            <View style={{ marginTop: 4 }}>
              <HandNote size={14}>{`+ ${remaining} more ${data.kind === 'roam' ? 'splits' : 'exercises'}`}</HandNote>
            </View>
          ) : null}
          {!rows.length ? <HandNote size={17}>every little effort counts.</HandNote> : null}
        </View>
        <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: s.muted, paddingTop: 9, marginTop: 8 }}>
          <StatRow stats={data.stats} color={s.ink} muted={s.muted} rule={s.line} />
        </View>
        {story ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <HandNote size={17}>{data.badge ? `${data.badge} · earned, not given.` : 'paid in effort. kept forever.'}</HandNote>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: story ? 18 : 12, paddingHorizontal: 4 }}>
        <SketchFooter />
      </View>
    </View>
  );
}
