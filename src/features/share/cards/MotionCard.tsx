import React from 'react';
import { Text, View } from 'react-native';
import type { ShareCardData } from '../cardData';
import { BigNumber, CARD_SIZE, CardTitle, Label, SAFE, StatRow, type CardFormat } from './parts';
import { RoutePanel, SetBars } from './visuals';
import { HAND, HandNote, NotebookLines, SKETCH as s, Scribble, SketchFooter, SketchHeader, EffortMark } from './sketch';

/** The activity's actual route or set rhythm becomes a page from a training notebook. */
export function MotionCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const story = format === 'story';
  const safe = SAFE[format];
  return (
    <View style={[CARD_SIZE[format], { backgroundColor: s.paper, overflow: 'hidden' }]}>
      <NotebookLines height={CARD_SIZE[format].height} />
      <View style={{ flex: 1, paddingHorizontal: safe.side, paddingTop: safe.top, paddingBottom: safe.bottom }}>
        <SketchHeader data={data} />
        <View style={{ marginTop: story ? 16 : 10 }}>
          <CardTitle title={data.title} color={s.ink} size={story ? 39 : 32} />
        </View>
        <View style={{ flex: 1, minHeight: 0, justifyContent: 'center', marginBottom: 12 }}>
          <View style={{ position: 'absolute', right: 2, top: 8, transform: [{ rotate: '12deg' }] }}>
            <EffortMark size={30} />
          </View>
          {data.kind === 'roam' ? (
            <RoutePanel data={data} width={308} height={story ? 134 : 90} color={s.green} muted={s.muted} background={s.paper} />
          ) : (
            <View style={{ gap: 8 }}>
              <SetBars loads={data.bars ?? []} width={308} height={story ? 84 : 48} color={s.green} muted={s.barMuted} />
              <HandNote size={17}>one set at a time.</HandNote>
            </View>
          )}
          {data.kind === 'roam' ? (
            <HandNote size={17}>
              {(data.route?.length ?? 0) > 1 ? 'left a little line on the world.' : 'time outside, well spent.'}
            </HandNote>
          ) : null}
        </View>
        <Label color={s.green} size={8}>
          {data.hero.label.toUpperCase()}
        </Label>
        <BigNumber stat={data.hero} size={story ? 90 : 70} color={s.ink} unitColor={s.green} />
        {story ? (
          <Text allowFontScaling={false} numberOfLines={1} style={{ fontFamily: HAND, fontSize: 19, color: s.green, marginBottom: 10 }}>
            {data.fact ?? 'a little progress worth keeping.'}
          </Text>
        ) : null}
        <Scribble />
        <View style={{ paddingVertical: 12 }}>
          <StatRow stats={data.stats} color={s.ink} muted={s.muted} rule={s.line} />
        </View>
        <View style={{ marginTop: story ? 16 : 10 }}>
          <SketchFooter />
        </View>
      </View>
    </View>
  );
}
