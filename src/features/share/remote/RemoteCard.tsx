import React, { useEffect, useRef } from 'react';
import { Image, Text, View } from 'react-native';
import type { ShareCardData } from '../cardData';
import { ActivitySketch } from '../cards/ActivitySketch';
import { RouteArt } from '../cards/visuals';
import { WORDMARK_WIDTH, WORDMARK_HEIGHT } from '@/src/components/brand/wordmarkGeometry';
import { MetricNumber } from '../cards/MetricNumber';
import { CARD_SIZE, StatRow, Wordmark, type CardFormat } from '../cards/parts';
import { Scribble, type ArtworkCallbacks } from '../cards/sketch';
import { boundText, imageURL, type RemoteTemplate } from './schema';
import { share } from '@/src/theme/colors';

export function RemoteCard({ design, data, format, onArtworkLoad, onArtworkError }: {
  design: RemoteTemplate; data: ShareCardData; format: CardFormat;
} & ArtworkCallbacks) {
  const layout = design.layouts[format];
  const pending = layout.blocks.filter(b => b.type === 'artwork' || b.type === 'image').length;
  const loaded = useRef(new Set<number>());
  const failed = useRef(false);
  const onLoad = useRef(onArtworkLoad); onLoad.current = onArtworkLoad;
  useEffect(() => { if (!pending) onLoad.current?.(); }, [pending]);
  const ready = (index: number) => {
    loaded.current.add(index);
    if (!failed.current && loaded.current.size === pending) onLoad.current?.();
  };
  const error = () => { failed.current = true; onArtworkError?.(); };
  return <View style={{ ...CARD_SIZE[format], backgroundColor: layout.background, overflow: 'hidden' }}>
    {layout.blocks.map((b, i) => {
      const color = b.color ?? share.sketch.ink;
      return <View key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.width, height: b.height, justifyContent: 'center' }}>
        {b.type === 'shape' ? <View style={{ width: b.width, height: b.height, backgroundColor: color, borderRadius: b.radius ?? 0 }} /> : null}
        {b.type === 'rule' ? <Scribble width={b.width} color={color} /> : null}
        {b.type === 'text' ? <Text allowFontScaling={false} numberOfLines={b.binding === 'title' ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.6}
          style={{ color, fontFamily: b.font === 'sans' ? 'Inter_600SemiBold' : 'PatrickHand', fontSize: b.size ?? 18, textAlign: b.align ?? 'left' }}>
          {b.binding ? boundText(b.binding, data) : b.text}
        </Text> : null}
        {b.type === 'metric' ? <MetricNumber value={data.hero.value} unit={data.hero.unit} size={b.size ?? 72} maxWidth={b.width} color={color} centered={b.align === 'center'} /> : null}
        {b.type === 'stats' ? <StatRow stats={data.stats.slice(0,3)} color={color} muted={color} rule={color} /> : null}
        {b.type === 'brand' ? <Wordmark color={color} accent={color} size={Math.min(b.size ?? 20, b.width / (1.2 * WORDMARK_WIDTH / WORDMARK_HEIGHT))} /> : null}
        {b.type === 'route' ? <RouteArt route={data.route ?? []} width={b.width} height={b.height} color={color} background={layout.background} /> : null}
        {b.type === 'artwork' ? <ActivitySketch data={data} width={b.width} height={b.height} onArtworkLoad={() => ready(i)} onArtworkError={error} /> : null}
        {b.type === 'image' ? <Image source={{ uri: imageURL(b, data), cache: 'force-cache' }} resizeMode="contain" fadeDuration={0}
          onLoad={() => ready(i)} onError={error} style={{ width: b.width, height: b.height }} /> : null}
      </View>;
    })}
  </View>;
}
