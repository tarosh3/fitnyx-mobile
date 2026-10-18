import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { PixelRatio, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { cardFileName } from '@/src/features/share/cardData';
import { CARD_SIZE, type CardFormat } from '@/src/features/share/ShareCard';

// Capture a ShareCard to a PNG, then share it or save it to Photos.
// Saving asks only for "add photos" (iOS) and nothing on Android 13+;
// the app never reads the library (READ_MEDIA_* are blocked in app.json).

/** Output width in pixels (Instagram's 1080). */
export const CARD_PIXEL_WIDTH = 1080;

/**
 * Renders the card to a PNG exactly 1080 px wide in the cache; returns its URI.
 * view-shot's width/height are in points (it multiplies by the screen's pixel
 * ratio), so passing 1080 on a 3× phone gave 3240 px, 10 MB files.
 */
export async function captureCard(ref: RefObject<View | null>, format: CardFormat): Promise<string> {
  const { width, height } = CARD_SIZE[format];
  const points = CARD_PIXEL_WIDTH / PixelRatio.get();
  return captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: points, height: (points * height) / width });
}

export async function shareCardImage(uri: string, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device');
  // view-shot names its file with a random id; share a copy with a readable name.
  const named = new File(Paths.cache, cardFileName(title));
  if (named.exists) named.delete();
  new File(uri).copy(named);
  await Sharing.shareAsync(named.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your FitNyx achievement' });
}

export type SaveResult = 'saved' | 'denied';

export async function saveCardImage(uri: string): Promise<SaveResult> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'saved';
}
