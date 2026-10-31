import React, { forwardRef } from 'react';
import { RemoteCard } from './remote/RemoteCard';
import type { RemoteTemplate } from './remote/schema';
import { View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { MotionCard } from '@/src/features/share/cards/MotionCard';
import { GlowCard } from '@/src/features/share/cards/GlowCard';
import { PaperCard } from '@/src/features/share/cards/PaperCard';
import { PhotoCard } from '@/src/features/share/cards/PhotoCard';
import type { ArtworkCallbacks } from '@/src/features/share/cards/sketch';
import { ReceiptCard } from '@/src/features/share/cards/ReceiptCard';
import { StickerCard } from '@/src/features/share/cards/StickerCard';

export { CARD_SIZE, type CardFormat } from '@/src/features/share/cards/parts';
import type { CardFormat } from '@/src/features/share/cards/parts';

export type BuiltinTemplate = 'glow' | 'motion' | 'photo' | 'sticker' | 'paper' | 'receipt';
export type ShareTemplate = BuiltinTemplate | `remote:${string}`;

/** Templates offered for each kind, most shareable first. */
export const TEMPLATES: Record<ShareCardData['kind'], { value: BuiltinTemplate; label: string }[]> = {
  roam: [
    { value: 'glow', label: 'Doodle' },
    { value: 'motion', label: 'Notebook' },
    { value: 'photo', label: 'Photo' },
    { value: 'sticker', label: 'Cutout' },
    { value: 'paper', label: 'Scrapbook' },
    { value: 'receipt', label: 'Splits' },
  ],
  workout: [
    { value: 'glow', label: 'Doodle' },
    { value: 'motion', label: 'Notebook' },
    { value: 'receipt', label: 'Log' },
    { value: 'photo', label: 'Photo' },
    { value: 'sticker', label: 'Cutout' },
    { value: 'paper', label: 'Scrapbook' },
  ],
};

interface Props extends ArtworkCallbacks {
  data: ShareCardData;
  format: CardFormat;
  template: ShareTemplate;
  design?: RemoteTemplate;
  photoUri?: string | null;
  onPhotoLoad?: () => void;
  onPhotoError?: () => void;
}

/** The shareable card in the chosen template, at full logical size (scale it for previews). */
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { data, format, template, design, photoUri, onPhotoLoad, onPhotoError, onArtworkLoad, onArtworkError },
  ref,
) {
  return (
    <View ref={ref} collapsable={false}>
      {design ? (
        <RemoteCard key={`${design.id}:${JSON.stringify(design)}:${format}:${data.artworkAppearance}:${data.artworkSubject}`} design={design} data={data} format={format} onArtworkLoad={onArtworkLoad} onArtworkError={onArtworkError} />
      ) : template === 'motion' ? (
        <MotionCard data={data} format={format} />
      ) : template === 'photo' ? (
        <PhotoCard
          onArtworkLoad={onArtworkLoad}
          onArtworkError={onArtworkError}
          data={data}
          format={format}
          photoUri={photoUri}
          onPhotoLoad={onPhotoLoad}
          onPhotoError={onPhotoError}
        />
      ) : template === 'sticker' ? (
        <StickerCard data={data} format={format} />
      ) : template === 'paper' ? (
        <PaperCard onArtworkLoad={onArtworkLoad} onArtworkError={onArtworkError} data={data} format={format} />
      ) : template === 'receipt' ? (
        <ReceiptCard data={data} format={format} />
      ) : (
        <GlowCard onArtworkLoad={onArtworkLoad} onArtworkError={onArtworkError} data={data} format={format} />
      )}
    </View>
  );
});
