import React from 'react';
import { View } from 'react-native';
import type { ShareCardData } from '../cardData';
import { BigNumber, CARD_SIZE, Label, SAFE, StatRow, Wordmark, type CardFormat } from './parts';
import { RouteArt } from './visuals';
import { HandNote, SKETCH as s, Scribble, EffortMark } from './sketch';

/** A genuinely transparent doodle decal for layering on a social story. */
export function StickerCard({ data, format }: { data: ShareCardData; format: CardFormat }) {
  const story = format === 'story';
  const safe = SAFE[format];
  const shadow = { textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 };
  return (
    <View
      style={[
        CARD_SIZE[format],
        { justifyContent: 'center', paddingHorizontal: safe.side, paddingTop: safe.top, paddingBottom: safe.bottom },
      ]}
    >
      <View style={{ alignItems: 'center', gap: story ? 13 : 9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <HandNote color={s.white} size={story ? 32 : 27}>
            {data.kind === 'roam' ? 'out & about.' : 'work put in.'}
          </HandNote>
          <EffortMark size={32} color={s.white} />
        </View>
        {(data.route?.length ?? 0) > 1 ? (
          <RouteArt route={data.route!} width={280} height={story ? 134 : 70} color={s.white} background="transparent" stroke={4} />
        ) : null}
        <Label color={s.white} size={8} style={shadow}>{`${data.kicker} / ${data.hero.label.toUpperCase()}`}</Label>
        <BigNumber centered stat={data.hero} size={story ? 96 : 76} color={s.white} unitColor={s.mint} shadow={shadow} />
        <Scribble color={s.white} />
        <View style={{ alignSelf: 'stretch', paddingVertical: 7 }}>
          <StatRow stats={data.stats} color={s.white} muted={s.white} rule={s.white} shadow={shadow} />
        </View>
        <View style={{ marginTop: 5, alignItems: 'center', gap: 6 }}>
          <Wordmark color={s.white} accent={s.mint} size={23} shadow={shadow} />
          <Label color={s.white} size={7} style={shadow}>
            MAKE YOUR OWN. TRACK WITH FITNYX.
          </Label>
        </View>
      </View>
    </View>
  );
}
