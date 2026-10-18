import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, LineString } from 'geojson';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { RouteSketch } from '@/src/features/roam/components/RouteSketch';
import { routeBounds } from '@/src/features/roam/routeGeometry';
import { useBasemap } from '@/src/features/roam/useBasemap';
import { focusLines, type HeatmapLine } from '@/src/features/roam/useRoamHeatmap';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useTheme } from '@/src/providers/ThemeProvider';

/**
 * Every Roam on one map. Each route is a translucent line, so the streets you
 * keep coming back to build up into the brightest paths — a personal heatmap.
 */
export function RouteHeatmap({ lines, style }: { lines: HeatmapLine[]; style?: StyleProp<ViewStyle> }) {
  const palette = useThemeColors();
  const { theme } = useTheme();
  const data = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: 'FeatureCollection',
      features: lines.map((l) => ({ type: 'Feature', properties: { id: l.id }, geometry: { type: 'LineString', coordinates: l.coords } })),
    }),
    [lines],
  );
  const bounds = useMemo(() => routeBounds(focusLines(lines).flatMap((l) => l.coords)), [lines]);
  const basemap = useBasemap(theme);
  // No basemap (offline): sketch the most recent route so the screen isn't blank.
  if (basemap.style === null) {
    return (
      <View style={[styles.wrap, style]}>
        <RouteSketch route={lines[0]?.coords ?? []} vehicleRanges={NO_RANGES} live={false} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <Map
        key={basemap.key}
        style={StyleSheet.absoluteFill}
        mapStyle={basemap.style}
        logo={false}
        compass={false}
        onDidFailLoadingMap={basemap.onLoadFailed}
      >
        {bounds ? <Camera bounds={bounds} padding={{ top: 48, right: 48, bottom: 48, left: 48 }} duration={0} /> : null}
        <GeoJSONSource id="roam-heat" data={data}>
          <Layer
            key="roam-heat-glow"
            type="line"
            id="roam-heat-glow"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': palette.primary, 'line-opacity': 0.2, 'line-width': HEAT_GLOW, 'line-blur': 6 }}
          />
          <Layer
            key="roam-heat-line"
            type="line"
            id="roam-heat-line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': palette.primary, 'line-opacity': 0.6, 'line-width': HEAT_WIDTH }}
          />
        </GeoJSONSource>
      </Map>
    </View>
  );
}

const NO_RANGES: [number, number][] = [];
const HEAT_WIDTH = ['interpolate', ['linear'], ['zoom'], 9, 2, 12, 3, 15, 4.5, 17, 5.5] as never;
const HEAT_GLOW = ['interpolate', ['linear'], ['zoom'], 9, 7, 12, 11, 15, 15, 17, 18] as never;

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 16 },
});
