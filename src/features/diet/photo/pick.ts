import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { resizeFor } from './model';

export type PhotoSource = 'camera' | 'library';

/**
 * Lets the user take or choose a meal photo. Returns its file uri, null when
 * cancelled, or 'denied' when camera access is off. The library uses the
 * system picker, which needs no permission (and never allowsEditing: on iOS
 * that swaps in the slow legacy picker).
 */
export async function pickMealPhoto(source: PhotoSource): Promise<string | null | 'denied'> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return 'denied';
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, exif: false };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}

/** The photo as base64 JPEG, at most MAX_PHOTO_SIDE on its longest side. */
export async function photoForUpload(uri: string): Promise<string> {
  const probe = await manipulateAsync(uri, [], {});
  const resize = resizeFor(probe.width, probe.height);
  const out = await manipulateAsync(uri, resize ? [{ resize }] : [], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new Error('Couldn’t prepare the photo.');
  return out.base64;
}
