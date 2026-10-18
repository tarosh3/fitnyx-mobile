import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import type { RoamPoint } from '@/src/features/roam/geo';
import type { RecordingMeta } from '@/src/features/roam/recordingStore';

// Raw GPS track export for accuracy testing (hidden: long-press the
// "… COMPLETE" heading on the review screen). Add `truthM` — the real distance,
// e.g. 4000 for 10 laps of a 400 m track — and drop the file into
// src/features/roam/__fixtures__/field/ to make it a regression check.

export const RAW_TRACK_FORMAT = 'fitnyx-roam-raw/1';

export interface RawTrack {
  format: typeof RAW_TRACK_FORMAT;
  type: RecordingMeta['type'];
  startedAt: string;
  platform: string;
  /** [lat, lng, t, accuracy, segment, gpsSpeed, course, altitude] — see RoamPoint. */
  points: RoamPoint[];
  /** The true distance in metres, filled in by hand for field tests. */
  truthM: number | null;
}

export function rawTrack(meta: RecordingMeta, points: RoamPoint[]): RawTrack {
  return {
    format: RAW_TRACK_FORMAT,
    type: meta.type,
    startedAt: new Date(meta.startedAtMs).toISOString(),
    platform: `${Platform.OS} ${Platform.Version}`,
    points,
    truthM: null,
  };
}

/** Opens the share sheet with the raw track: a JSON file on iOS, text on Android (its Share takes text only). */
export async function shareRawTrack(meta: RecordingMeta, points: RoamPoint[]): Promise<void> {
  const json = JSON.stringify(rawTrack(meta, points));
  const name = `roam-${meta.type}-${meta.startedAtMs}.json`;
  if (Platform.OS === 'ios') {
    const file = new File(Paths.cache, name);
    file.write(json);
    await Share.share({ url: file.uri, title: name });
  } else {
    await Share.share({ message: json, title: name });
  }
}
