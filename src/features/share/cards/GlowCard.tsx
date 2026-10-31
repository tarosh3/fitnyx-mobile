import React from 'react';
import { View } from 'react-native';
import type { ShareCardData } from '../cardData';
import { BigNumber, CARD_SIZE, CardTitle, Label, SAFE, StatRow, type CardFormat } from './parts';
import { type ArtworkCallbacks, DoodleArt, HandNote, SKETCH as s, Scribble, SketchFooter, SketchHeader } from './sketch';

/** A personal sketchbook cover, with live results typeset independently of the art. */
export function GlowCard({ data, format, onArtworkLoad, onArtworkError }: { data: ShareCardData; format: CardFormat } & ArtworkCallbacks) {
  const story = format === 'story';
  const safe = SAFE[format];
  return (
    <View
      style={[
        CARD_SIZE[format],
        { backgroundColor: s.paper, paddingHorizontal: safe.side, paddingTop: safe.top, paddingBottom: safe.bottom, overflow: 'hidden' },
      ]}
    >
      <SketchHeader data={data} />
      <View style={{ marginTop: story ? 16 : 10 }}>
        <CardTitle title={data.title} color={s.ink} size={story ? 41 : 34} />
        <HandNote size={story ? 20 : 17}>
          {data.kind === 'roam' ? 'a little fresh air. a lot of good.' : 'showed up. put the work in.'}
        </HandNote>
      </View>
      <View style={{ flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center' }}>
        <DoodleArt onArtworkLoad={onArtworkLoad} onArtworkError={onArtworkError} data={data} height={story ? 174 : 112} />
      </View>
      <View>
        <Label color={s.green} size={8}>
          {data.hero.label.toUpperCase()}
        </Label>
        <BigNumber stat={data.hero} size={story ? 84 : 66} color={s.ink} unitColor={s.green} />
      </View>
      <Scribble />
      <View style={{ paddingVertical: story ? 14 : 10 }}>
        <StatRow stats={data.stats} color={s.ink} muted={s.muted} rule={s.line} />
      </View>
      <Scribble />
      <View style={{ marginTop: story ? 18 : 12 }}>
        <SketchFooter />
      </View>
    </View>
  );
}
