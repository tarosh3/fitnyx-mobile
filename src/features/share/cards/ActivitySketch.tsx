import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { ShareCardData } from '../cardData';
import { ART_SUBJECTS, artworkSubject, type ArtworkAppearance, type ArtworkSubject } from '../artwork';
import type { ArtworkCallbacks } from './sketch';
import { share } from '@/src/theme/colors';

const ATLASES: Record<ArtworkAppearance, ImageSourcePropType> = {
  woman: require('../../../../assets/images/share/athlete-woman-atlas.png'),
  man: require('../../../../assets/images/share/athlete-man-atlas.png'),
  equipment: require('../../../../assets/images/share/equipment-atlas.png'),
};
// The image generator returned 1448×1086 atlases (4×3 square cells).
const CELL = 362;
function region(appearance: ArtworkAppearance, subject: ArtworkSubject): [number, number, number, number] {
  const index = ART_SUBJECTS.indexOf(subject);
  // Atlas rows are hand drawn, not perfectly aligned. These measured crop windows
  // keep a neighbouring pose out and preserve the full head/feet of each athlete.
  if (appearance === 'woman') {
    if (subject === 'push') return [0, 0, 362, 370];
    if (subject === 'mobility') return [0, 365, 401, 337];
    if (subject === 'full-body') return [410, 365, 314, 337];
    if (index >= 4 && index < 8) return [(index % 4) * CELL, 365, CELL, 337];
    if (subject === 'cycle') return [370, 706, 367, 380];
    if (subject === 'cycle-fast') return [742, 706, 344, 380];
    if (index >= 8) return [(index % 4) * CELL, 706, CELL, 380];
  }
  if (appearance === 'man') {
    if (index >= 4 && index < 8) return [(index % 4) * CELL, 362, CELL, 340];
    if (index >= 8) return [(index % 4) * CELL, 706, CELL, 380];
  }
  if (appearance === 'equipment' && subject === 'cycle') return [374, 724, 363, 362];
  return [(index % 4) * CELL, Math.floor(index / 4) * CELL, CELL, CELL];
}

function Tile({
  appearance,
  subject,
  size,
  onArtworkLoad,
  onArtworkError,
}: {
  appearance: ArtworkAppearance;
  subject: ArtworkSubject;
  size: number;
} & ArtworkCallbacks) {
  const [x, y, width, height] = region(appearance, subject);
  const scale = size / Math.max(width, height);
  return (
    <View style={{ width: width * scale, height: height * scale, overflow: 'hidden' }}>
      <Image
        source={ATLASES[appearance]}
        fadeDuration={0}
        resizeMode="stretch"
        onLoad={onArtworkLoad}
        onError={onArtworkError}
        style={{ position: 'absolute', width: 1448 * scale, height: 1086 * scale, left: -x * scale, top: -y * scale }}
      />
    </View>
  );
}

/** Genuine illustrated assets; the logged activity determines the pose, never the title. */
export function ActivitySketch({
  data,
  width = 308,
  height = 180,
  onArtworkLoad,
  onArtworkError,
}: {
  data: ShareCardData;
  width?: number;
  height?: number;
} & ArtworkCallbacks) {
  const subject = data.artworkSubject ?? artworkSubject(data);
  const appearance = data.artworkAppearance ?? 'equipment';
  const size = Math.min(height, width * 0.75);
  // Keep one image per exported composition so its onLoad accurately gates capture.
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} style={{ position: 'absolute' }} accessible={false}>
        <Path
          d={`M${width * 0.13} ${height * 0.82} Q${width * 0.48} ${height * 0.85} ${width * 0.87} ${height * 0.8}`}
          stroke={share.sketch.ground}
          strokeWidth={1}
          fill="none"
        />
        {subject === 'run' || subject === 'cycle-fast' || subject === 'cardio' ? (
          <Path
            d={`M${width * 0.09} ${height * 0.39} l${width * 0.12} -3 M${width * 0.04} ${height * 0.48} l${width * 0.15} -2 M${width * 0.08} ${height * 0.57} l${width * 0.1} -2`}
            stroke={share.sketch.speedLines}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <Tile appearance={appearance} subject={subject} size={size} onArtworkLoad={onArtworkLoad} onArtworkError={onArtworkError} />
    </View>
  );
}
