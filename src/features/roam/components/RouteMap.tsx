import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  NativeUserLocation,
  RasterDEMSource,
  type CameraRef,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';
import React, { useMemo, useRef, useState } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { MapControls } from '@/src/features/roam/components/MapControls';
import { RouteSketch } from '@/src/features/roam/components/RouteSketch';
import { TERRAIN_ATTRIBUTION, TERRAIN_TILES } from '@/src/features/roam/mapStyle';
import { useBasemap } from '@/src/features/roam/useBasemap';
import {
  directionMarks,
  endpoints,
  routeBounds,
  routeLine,
  vehicleLines,
  type LngLatPair,
} from '@/src/features/roam/routeGeometry';
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
  /** Replay flyover: a tilted camera on this point, turned to the direction of travel. */
  follow?: { coord: LngLatPair; bearing: number } | null;
  /** Replay: kilometre markers reached so far (`km` property is the label). */
  kmMarks?: FeatureCollection<Point>;
  /** Offline fallback: draw the route only up to this fraction (replay). */
  sketchProgress?: number;
  /** Hide the map buttons (e.g. while the replay's stats overlay the top). */
  controlsHidden?: boolean;
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
  controlsHidden = false,
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

  // OpenFreeMap → VersaTiles → the offline sketch (see useBasemap).
  const basemap = useBasemap(theme);
  const showSketch = basemap.style === null;
  // Live: north-up (default) or heading-up, where the map turns with you.
  const [headingUp, setHeadingUp] = useState(false);
  // Shaded relief from open terrain data, on demand (an extra tile download).
  const [terrain, setTerrain] = useState(false);

  // 3D ⇄ flat: flyover and heading-up start tilted, overviews flat; the
  // button flips whichever view is showing.
  const [tiltChoice, setTiltChoice] = useState<boolean | null>(null);
  const tilted = tiltChoice ?? Boolean(follow || (live && headingUp));
  // Zoom buttons: following cameras (flyover, live) set their own zoom on
  // every update, so the buttons shift it; a still overview zooms directly.
  const [zoomOffset, setZoomOffset] = useState(0);
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const following = Boolean(follow || live);
  // The map's native view may not exist yet (it throws, not rejects), so
  // these only run from a button press and never fail loudly.
  const zoomBy = async (delta: number) => {
    if (following) {
      setZoomOffset((z) => Math.min(MAX_ZOOM_OFFSET, Math.max(-MAX_ZOOM_OFFSET, z + delta)));
      return;
    }
    try {
      const zoom = await mapRef.current?.getZoom();
      if (zoom != null) cameraRef.current?.zoomTo(zoom + delta, { duration: 250 });
    } catch {
      // map not ready
    }
  };
  const toggleTilt = async () => {
    const next = !tilted;
    setTiltChoice(next);
    if (following) return; // following cameras take the pitch from their props
    try {
      const center = await mapRef.current?.getCenter();
      if (center) cameraRef.current?.easeTo({ center, pitch: next ? OVERVIEW_PITCH : 0, duration: 400 });
    } catch {
      // map not ready
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      {basemap.style !== null ? (
        <Map
          ref={mapRef}
          key={basemap.key}
          style={StyleSheet.absoluteFill}
          mapStyle={basemap.style}
          logo={false}
          compass={false}
          onDidFailLoadingMap={basemap.onLoadFailed}
        >
          {follow ? (
            // Flyover: tilted so Liberty's 3D buildings stand up, turned along the route.
            // Focus below centre: the stats overlay the top and the road ahead stays in view.
            <Camera
              ref={cameraRef}
              center={follow.coord}
              zoom={16 + zoomOffset}
              pitch={tilted ? 55 : 0}
              bearing={follow.bearing}
              padding={FLYOVER_PADDING}
              duration={450}
              easing="linear"
            />
          ) : live && headingUp ? (
            <Camera ref={cameraRef} trackUserLocation={HEADING_MODE} zoom={16.5 + zoomOffset} pitch={tilted ? 40 : 0} />
          ) : live && last ? (
            <Camera ref={cameraRef} center={last} zoom={16 + zoomOffset} pitch={tilted ? 40 : 0} duration={600} />
          ) : live ? (
            <Camera ref={cameraRef} trackUserLocation="default" zoom={15 + zoomOffset} pitch={tilted ? 40 : 0} />
          ) : bounds ? (
            <Camera ref={cameraRef} bounds={bounds} padding={{ top: 40, right: 40, bottom: 40, left: 40 }} duration={0} />
          ) : null}

          {live ? <NativeUserLocation mode={HEADING_MODE} /> : null}

          {terrain && !basemap.isFallback ? (
            <RasterDEMSource id="roam-dem" tiles={[TERRAIN_TILES]} tileSize={512} maxzoom={12} encoding="terrarium" attribution={TERRAIN_ATTRIBUTION}>
              <Layer
                key="roam-hillshade"
                type="hillshade"
                id="roam-hillshade"
                beforeId="waterway_tunnel"
                paint={{ 'hillshade-exaggeration': 0.45 }}
              />
            </RasterDEMSource>
          ) : null}

          <Images images={ROAM_ICONS} />

          <GeoJSONSource id="roam-route" data={line} lineMetrics={Boolean(lineGradient)}>
            {/* A soft shadow and an outline lift the route off the roads beneath. */}
            <Layer
              key="roam-route-shadow"
              type="line"
              id="roam-route-shadow"
              layout={ROUND}
              paint={{ 'line-color': colors.dark.background, 'line-opacity': 0.28, 'line-width': SHADOW_WIDTH, 'line-blur': 4 }}
            />
            <Layer
              key="roam-route-casing"
              type="line"
              id="roam-route-casing"
              layout={ROUND}
              paint={{ 'line-color': palette.surface, 'line-width': CASING_WIDTH }}
            />
            {lineGradient ? (
              <Layer
                key="roam-route-ghost"
                type="line"
                id="roam-route-ghost"
                layout={ROUND}
                paint={{ 'line-color': palette.text, 'line-opacity': 0.18, 'line-width': LINE_WIDTH }}
              />
            ) : null}
            <Layer
                key="roam-route-line"
              type="line"
              id="roam-route-line"
              layout={ROUND}
              paint={
                lineGradient
                  ? { 'line-gradient': lineGradient as never, 'line-width': LINE_WIDTH }
                  : { 'line-color': palette.primary, 'line-width': LINE_WIDTH }
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
              layout={ROUND}
              paint={{ 'line-color': palette.mutedText, 'line-width': LINE_WIDTH, 'line-dasharray': [1, 1.5] }}
            />
          </GeoJSONSource>

          <GeoJSONSource id="roam-endpoints" data={markers}>
            <Layer
              key="roam-endpoints-icon"
              type="symbol"
              id="roam-endpoints-icon"
              layout={{
                'icon-image': ['match', ['get', 'kind'], 'start', 'roam-start', 'roam-finish'],
                'icon-size': 1,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
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
                  'circle-radius': 9,
                  'circle-color': palette.surface,
                  'circle-stroke-width': 1.5,
                  'circle-stroke-color': palette.text,
                }}
              />
              <Layer
                key="roam-km-label"
                type="symbol"
                id="roam-km-label"
                layout={{
                  'text-field': ['to-string', ['get', 'km']],
                  'text-size': 10,
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
      ) : null}
      {!showSketch ? (
        <MapControls
          live={live}
          topHidden={controlsHidden}
          headingUp={headingUp}
          onToggleHeadingUp={() => setHeadingUp((v) => !v)}
          terrain={terrain}
          onToggleTerrain={basemap.isFallback ? undefined : () => setTerrain((v) => !v)}
          tilted={tilted}
          onToggleTilt={() => void toggleTilt()}
          onZoomIn={() => void zoomBy(1)}
          onZoomOut={() => void zoomBy(-1)}
        />
      ) : null}
      {showSketch ? (
        <RouteSketch route={route} vehicleRanges={vehicleRanges} live={live} progress={sketchProgress} />
      ) : null}
    </View>
  );
});

const NO_RANGES: [number, number][] = [];

const ROUND = { 'line-cap': 'round', 'line-join': 'round' } as const;
const FLYOVER_PADDING = { top: 150, right: 0, bottom: 0, left: 0 };
const OVERVIEW_PITCH = 50; // 3D on a still map: enough for buildings to stand up
const MAX_ZOOM_OFFSET = 5;
// iOS draws a compass cone; Android's arrow follows the GPS course.
const HEADING_MODE = Platform.OS === 'android' ? 'course' : 'heading';
// Widths grow with zoom: a slim line over the whole city, a bold one up close.
const LINE_WIDTH = ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 5, 17, 8] as never;
const CASING_WIDTH = ['interpolate', ['linear'], ['zoom'], 10, 5.5, 14, 8.5, 17, 12.5] as never;
const SHADOW_WIDTH = ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 13, 17, 18] as never;

// Map icons, drawn at 3× (white / near-black, so they read on any map style).
const ROAM_ICONS = {
  'roam-arrow': require('@/assets/images/roam/roam-arrow.png'),
  'roam-chevron': require('@/assets/images/roam/roam-chevron.png'),
  'roam-start': require('@/assets/images/roam/roam-start.png'),
  'roam-finish': require('@/assets/images/roam/roam-finish.png'),
};

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 16 },
});
