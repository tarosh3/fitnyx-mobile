import React from 'react';
import { View } from 'react-native';
import type { ShareCardData } from '../cardData';
import { BigNumber, CARD_SIZE, CardTitle, Label, SAFE, StatRow, type CardFormat } from './parts';
import { type ArtworkCallbacks, DoodleArt, HandNote, SKETCH as s, Scribble, SketchFooter, SketchHeader } from './sketch';

/** A scrapbook page: taped illustration, personal result, and a handwritten caption. */
export function PaperCard({ data, format, onArtworkLoad, onArtworkError }: { data: ShareCardData; format: CardFormat } & ArtworkCallbacks) {
  const story = format === 'story';
  const safe = SAFE[format];
  return (
    <View
      style={[
        CARD_SIZE[format],
        { backgroundColor: s.desk, paddingTop: safe.top, paddingBottom: safe.bottom, paddingHorizontal: safe.side, overflow: 'hidden' },
      ]}
    >
      <SketchHeader data={data} />
      <View style={{ marginTop: 10 }}>
        <CardTitle title={data.title} color={s.ink} size={story ? 38 : 31} />
      </View>
      <View style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: s.paper,
            padding: 8,
            paddingBottom: 10,
            transform: [{ rotate: '-3deg' }],
            borderWidth: 1,
            borderColor: s.tapeEdge,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -7,
              width: 70,
              height: 18,
              backgroundColor: s.tape,
              opacity: 0.85,
              alignSelf: 'center',
              zIndex: 1,
              transform: [{ rotate: '7deg' }],
            }}
          />
          <DoodleArt
            onArtworkLoad={onArtworkLoad}
            onArtworkError={onArtworkError}
            data={data}
            width={story ? 280 : 230}
            height={story ? 152 : 92}
          />
          <View style={{ alignItems: 'center' }}>
            <HandNote size={story ? 20 : 16}>
              {data.kind === 'roam' ? 'a little adventure to remember.' : 'a date with my stronger self.'}
            </HandNote>
          </View>
        </View>
      </View>
      <Label color={s.green} size={8}>
        {data.hero.label.toUpperCase()}
      </Label>
      <BigNumber stat={data.hero} size={story ? 80 : 62} color={s.ink} unitColor={s.green} />
      <Scribble />
      <View style={{ paddingVertical: story ? 14 : 10 }}>
        <StatRow stats={data.stats} color={s.ink} muted={s.muted} rule={s.rule} />
      </View>
      <View style={{ marginTop: story ? 16 : 8 }}>
        <SketchFooter />
      </View>
    </View>
  );
}
