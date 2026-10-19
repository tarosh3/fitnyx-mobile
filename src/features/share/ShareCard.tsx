import React, { forwardRef } from 'react';
import { View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { MotionCard } from '@/src/features/share/cards/MotionCard';
import { GlowCard } from '@/src/features/share/cards/GlowCard';
import { PaperCard } from '@/src/features/share/cards/PaperCard';
import { PhotoCard } from '@/src/features/share/cards/PhotoCard';
import { ReceiptCard } from '@/src/features/share/cards/ReceiptCard';
import { StickerCard } from '@/src/features/share/cards/StickerCard';

export { CARD_SIZE, type CardFormat } from '@/src/features/share/cards/parts';
import type { CardFormat } from '@/src/features/share/cards/parts';

export type ShareTemplate = 'glow' | 'motion' | 'photo' | 'sticker' | 'paper' | 'receipt';

/** Templates offered for each kind, most shareable first. */
export const TEMPLATES: Record<ShareCardData['kind'], { value: ShareTemplate; label: string }[]> = {
  roam: [
    { value: 'glow', label: 'Poster' },
    { value: 'motion', label: 'Motion' },
    { value: 'photo', label: 'Photo' },
    { value: 'sticker', label: 'Cutout' },
    { value: 'paper', label: 'Editorial' },
    { value: 'receipt', label: 'Splits' },
  ],
  workout: [
    { value: 'glow', label: 'Poster' },
    { value: 'motion', label: 'Motion' },
    { value: 'receipt', label: 'Log' },
    { value: 'photo', label: 'Photo' },
    { value: 'sticker', label: 'Cutout' },
    { value: 'paper', label: 'Editorial' },
  ],
};

interface Props {
  data: ShareCardData;
  format: CardFormat;
  template: ShareTemplate;
  photoUri?: string | null;
  onPhotoLoad?: () => void;
  onPhotoError?: () => void;
}

/** The shareable card in the chosen template, at full logical size (scale it for previews). */
export const ShareCard = forwardRef<View, Props>(function ShareCard({ data, format, template, photoUri, onPhotoLoad, onPhotoError }, ref) {
  return (
    <View ref={ref} collapsable={false}>
      {template === 'motion' ? (
        <MotionCard data={data} format={format} />
      ) : template === 'photo' ? (
        <PhotoCard data={data} format={format} photoUri={photoUri} onPhotoLoad={onPhotoLoad} onPhotoError={onPhotoError} />
      ) : template === 'sticker' ? (
        <StickerCard data={data} format={format} />
      ) : template === 'paper' ? (
        <PaperCard data={data} format={format} />
      ) : template === 'receipt' ? (
        <ReceiptCard data={data} format={format} />
      ) : (
        <GlowCard data={data} format={format} />
      )}
    </View>
  );
});
