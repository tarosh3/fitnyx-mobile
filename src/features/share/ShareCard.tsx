import React, { forwardRef } from 'react';
import { View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { GlowCard } from '@/src/features/share/cards/GlowCard';
import { PaperCard } from '@/src/features/share/cards/PaperCard';
import { PhotoCard } from '@/src/features/share/cards/PhotoCard';
import { ReceiptCard } from '@/src/features/share/cards/ReceiptCard';
import { StickerCard } from '@/src/features/share/cards/StickerCard';

export { CARD_SIZE, type CardFormat } from '@/src/features/share/cards/parts';
import type { CardFormat } from '@/src/features/share/cards/parts';

export type ShareTemplate = 'glow' | 'photo' | 'sticker' | 'paper' | 'receipt';

/** Templates offered for each kind, most shareable first. */
export const TEMPLATES: Record<ShareCardData['kind'], { value: ShareTemplate; label: string }[]> = {
  roam: [
    { value: 'glow', label: 'Glow' },
    { value: 'photo', label: 'Photo' },
    { value: 'sticker', label: 'Sticker' },
    { value: 'paper', label: 'Paper' },
    { value: 'receipt', label: 'Splits' },
  ],
  workout: [
    { value: 'glow', label: 'Glow' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'photo', label: 'Photo' },
    { value: 'sticker', label: 'Sticker' },
    { value: 'paper', label: 'Paper' },
  ],
};

interface Props {
  data: ShareCardData;
  format: CardFormat;
  template: ShareTemplate;
  photoUri?: string | null;
}

/** The shareable card in the chosen template, at full logical size (scale it for previews). */
export const ShareCard = forwardRef<View, Props>(function ShareCard({ data, format, template, photoUri }, ref) {
  return (
    <View ref={ref} collapsable={false}>
      {template === 'photo' ? (
        <PhotoCard data={data} format={format} photoUri={photoUri} />
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
