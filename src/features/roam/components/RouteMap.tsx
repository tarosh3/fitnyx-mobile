import { Camera, GeoJSONSource, Images, Layer, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { RouteSketch } from '@/src/features/roam/components/RouteSketch';
import { MAP_STYLE_URL } from '@/src/features/roam/mapStyle';
import {
  directionMarks,
  endpoints,
  routeBounds,
  routeLine,
  vehicleLines,
  type LngLatPair,
} from '@/src/features/roam/routeGeometry';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useTheme } from '@/src/providers/ThemeProvider';
import { colors } from '@/src/theme/colors';

export interface RouteMapProps {
  /** Route as [lng, lat] pairs. */
  route: LngLatPair[];
  /** Inclusive index ranges into `route` travelled by vehicle (drawn greyed). */
  vehicleRanges?: [number, number][];
  /** Live recording: follow the latest position instead of framing the route. */
  live?: boolean;
  /**
   * Replay: a MapLibre `line-gradient` expression (speed colours, revealed up
   * to the playhead). The not-yet-drawn route shows as a faint ghost line.
   */
  lineGradient?: unknown[];
  /** Replay playhead: where, which way (degrees from north) and the current speed colour. */
  head?: { coord: LngLatPair; bearing: number; color: string } | null;
  /** Small arrows along the route showing which way it was travelled (tells overlapping passes apart). */
  showDirection?: boolean;
  /** Replay: keep the camera on this point instead of framing the whole route. */
  follow?: LngLatPair | null;
  /** Replay: kilometre markers reached so far (`km` property is the label). */
  kmMarks?: FeatureCollection<Point>;
  /** Offline fallback: draw the route only up to this fraction (replay). */
  sketchProgress?: number;
  style?: StyleProp<ViewStyle>;
}

// Memoized: the live screen re-renders every second for its clock, but the
// map only needs to update when a new fix changes the route.
export const RouteMap = React.memo(function RouteMap({
  route,
  vehicleRanges = NO_RANGES,
  live = false,
  lineGradient,
  head,
  showDirection = false,
  follow,
  kmMarks,
  sketchProgress,
  style,
}: RouteMapProps) {
  const palette = useThemeColors();
  const { theme } = useTheme();

  const line = useMemo(() => routeLine(route), [route]);
  const vehicle = useMemo(() => vehicleLines(route, vehicleRanges), [route, vehicleRanges]);
  const markers = useMemo(() => endpoints(route, !live), [route, live]);
  const bounds = useMemo(() => routeBounds(route), [route]);
  const arrows = useMemo(() => (showDirection ? directionMarks(route) : null), [route, showDirection]);
  const last = route[route.length - 1];
  const headPoint = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: head
        ? [
            {
              type: 'Feature',
              properties: { bearing: head.bearing, color: head.color },
              geometry: { type: 'Point', coordinates: head.coord },
            },
          ]
        : [],
    }),
    [head],
  );

  // The style and tiles come from the internet. Until the style loads (or if
  // it fails) the map is blank — the route layers need a style too — so draw
  // the route ourselves, and remount the map to retry once back online.
  const { isOnline } = useNetworkStatus();
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [styleFailed, setStyleFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current && !styleLoaded) {
      setStyleFailed(false);
      setAttempt((n) => n + 1);
    }
    wasOnline.current = isOnline;
  }, [isOnline, styleLoaded]);
  const showSketch = !styleLoaded && (styleFailed || !isOnline);

  return (
    <View style={[styles.wrap, style]}>
      <Map
        key={attempt}
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL[theme]}
        logo={false}
        compass={false}
        onDidFinishLoadingStyle={() => setStyleLoaded(true)}
        onDidFailLoadingMap={() => setStyleFailed(true)}
      >
        {follow ? (
          <Camera center={follow} zoom={15.5} duration={450} easing="linear" />
        ) : live && last ? (
          <Camera center={last} zoom={16} duration={600} />
        ) : live ? (
          <Camera trackUserLocation="default" zoom={15} />
        ) : bounds ? (
          <Camera bounds={bounds} padding={{ top: 40, right: 40, bottom: 40, left: 40 }} duration={0} />
        ) : null}

        {live ? <NativeUserLocation /> : null}

        <Images images={ROAM_ICONS} />

        <GeoJSONSource id="roam-route" data={line} lineMetrics={Boolean(lineGradient)}>
          {lineGradient ? (
            <Layer
              key="roam-route-ghost"
              type="line"
              id="roam-route-ghost"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': palette.text, 'line-opacity': 0.18, 'line-width': 5 }}
            />
          ) : null}
          <Layer
              key="roam-route-line"
            type="line"
            id="roam-route-line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={
              lineGradient
                ? { 'line-gradient': lineGradient as never, 'line-width': 5.5 }
                : { 'line-color': palette.primary, 'line-width': 5 }
            }
          />

        </GeoJSONSource>

        {arrows ? (
          // Chevrons on the right of the direction of travel: an out-and-back
          // shows two rows pointing opposite ways, one each side of the line.
          <GeoJSONSource id="roam-direction" data={arrows}>
            <Layer
              key="roam-direction-chevron"
              type="symbol"
              id="roam-direction-chevron"
              layout={{
                'icon-image': 'roam-chevron',
                'icon-size': 1,
                // The chevron points along +x; rotate it onto the heading.
                'icon-rotate': ['-', ['get', 'bearing'], 90],
                'icon-rotation-alignment': 'map',
                'icon-offset': [0, 9],
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              }}
            />
          </GeoJSONSource>
        ) : null}

        <GeoJSONSource id="roam-vehicle" data={vehicle}>
          <Layer
              key="roam-vehicle-line"
            type="line"
            id="roam-vehicle-line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': palette.mutedText, 'line-width': 5, 'line-dasharray': [1, 1.5] }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="roam-endpoints" data={markers}>
          <Layer
              key="roam-endpoints-circle"
            type="circle"
            id="roam-endpoints-circle"
            paint={{
              'circle-radius': 7,
              'circle-color': ['match', ['get', 'kind'], 'start', palette.primary, palette.text],
              'circle-stroke-width': 3,
              'circle-stroke-color': palette.background,
            }}
          />
        </GeoJSONSource>

        {kmMarks ? (
          <GeoJSONSource id="roam-km" data={kmMarks}>
            <Layer
              key="roam-km-circle"
              type="circle"
              id="roam-km-circle"
              paint={{
                'circle-radius': 10,
                'circle-color': palette.background,
                'circle-stroke-width': 2,
                'circle-stroke-color': palette.text,
              }}
            />
            <Layer
              key="roam-km-label"
              type="symbol"
              id="roam-km-label"
              layout={{
                'text-field': ['to-string', ['get', 'km']],
                'text-size': 11,
                'text-font': ['Noto Sans Bold'],
                'text-allow-overlap': true,
              }}
              paint={{ 'text-color': palette.text }}
            />
          </GeoJSONSource>
        ) : null}

        {head ? (
          // The playhead "puck": a halo and ring in the current speed colour, a
          // white disc and a heading arrow — unmistakable from the start/end dots.
          <GeoJSONSource id="roam-head" data={headPoint}>
            <Layer
              key="roam-head-halo"
              type="circle"
              id="roam-head-halo"
              paint={{ 'circle-radius': 22, 'circle-color': ['get', 'color'], 'circle-opacity': 0.22, 'circle-blur': 0.4 }}
            />
            <Layer
              key="roam-head-disc"
              type="circle"
              id="roam-head-disc"
              paint={{
                'circle-radius': 13,
                'circle-color': colors.dark.text, // a light disc in both themes
                'circle-stroke-width': 3.5,
                'circle-stroke-color': ['get', 'color'],
              }}
            />
            <Layer
              key="roam-head-arrow"
              type="symbol"
              id="roam-head-arrow"
              layout={{
                'icon-image': 'roam-arrow',
                'icon-size': 0.62,
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
      {showSketch ? (
        <RouteSketch route={route} vehicleRanges={vehicleRanges} live={live} progress={sketchProgress} />
      ) : null}
    </View>
  );
});

const NO_RANGES: [number, number][] = [];

// Map icons, drawn at 3× (white / near-black, so they read on any map style).
const ROAM_ICONS = {
  'roam-arrow': require('@/assets/images/roam/roam-arrow.png'),
  'roam-chevron': require('@/assets/images/roam/roam-chevron.png'),
};

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 16 },
});
