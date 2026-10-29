import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { elevationProfile, profilePath } from '@/src/features/roam/elevationProfile';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const HEIGHT = 84;

interface Props {
  route: LngLatPair[];
  elevations?: number[];
  gainM?: number | null;
  /** Replay playhead as a fraction of the route's length; null when not playing. */
  progress?: number | null;
}

/** Ground height along a saved Roam, from open terrain data. Hidden when unknown. */
export function ElevationProfile({ route, elevations, gainM, progress }: Props) {
  const c = useThemeColors();
  const [width, setWidth] = useState(0);
  const data = useMemo(() => elevationProfile(route, elevations), [route, elevations]);
  const paths = useMemo(() => (data && width ? profilePath(data, width, HEIGHT) : null), [data, width]);
  if (!data) return null;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Elevation</Text>
        <Text style={[styles.meta, { color: c.mutedText }]}>
          {gainM != null ? `↑ ${Math.round(gainM)} m · ` : ''}
          {Math.round(data.min)}–{Math.round(data.max)} m
        </Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {paths ? (
          <Svg width={width} height={HEIGHT} accessibilityLabel={`Elevation from ${Math.round(data.min)} to ${Math.round(data.max)} metres`}>
            <Defs>
              <LinearGradient id="roam-elev" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.primary} stopOpacity={0.45} />
                <Stop offset="1" stopColor={c.primary} stopOpacity={0.04} />
              </LinearGradient>
            </Defs>
            <Path d={paths.area} fill="url(#roam-elev)" />
            <Path d={paths.line} stroke={c.primary} strokeWidth={2} fill="none" strokeLinejoin="round" />
            {progress != null ? (
              <Line x1={progress * width} x2={progress * width} y1={0} y2={HEIGHT} stroke={c.text} strokeWidth={1.5} />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <Text style={[styles.credit, { color: c.mutedText }]}>Terrain: Copernicus GLO-30 (DLR, Airbus, EU/ESA) via Mapterhorn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 14, fontFamily: type.weight.extrabold },
  meta: { fontSize: 12, fontFamily: type.weight.semibold, fontVariant: ['tabular-nums'] },
  credit: { fontSize: type.size.micro },
});
