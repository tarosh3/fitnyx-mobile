import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { RouteSketch } from '@/src/features/roam/components/RouteSketch';
import { MAP_STYLE_URL } from '@/src/features/roam/mapStyle';
import { endpoints, routeBounds, routeLine, vehicleLines, type LngLatPair } from '@/src/features/roam/routeGeometry';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useTheme } from '@/src/providers/ThemeProvider';

export interface RouteMapProps {
  /** Route as [lng, lat] pairs. */
  route: LngLatPair[];
  /** Inclusive index ranges into `route` travelled by vehicle (drawn greyed). */
  vehicleRanges?: [number, number][];
  /** Live recording: follow the latest position instead of framing the route. */
  live?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Memoized: the live screen re-renders every second for its clock, but the
// map only needs to update when a new fix changes the route.
export const RouteMap = React.memo(function RouteMap({
  route,
  vehicleRanges = NO_RANGES,
  live = false,
  style,
}: RouteMapProps) {
  const palette = useThemeColors();
  const { theme } = useTheme();

  const line = useMemo(() => routeLine(route), [route]);
  const vehicle = useMemo(() => vehicleLines(route, vehicleRanges), [route, vehicleRanges]);
  const markers = useMemo(() => endpoints(route, !live), [route, live]);
  const bounds = useMemo(() => routeBounds(route), [route]);
  const last = route[route.length - 1];

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
        {live && last ? (
          <Camera center={last} zoom={16} duration={600} />
        ) : live ? (
          <Camera trackUserLocation="default" zoom={15} />
        ) : bounds ? (
          <Camera bounds={bounds} padding={{ top: 40, right: 40, bottom: 40, left: 40 }} duration={0} />
        ) : null}

        {live ? <NativeUserLocation /> : null}

        <GeoJSONSource id="roam-route" data={line}>
          <Layer
            type="line"
            id="roam-route-line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': palette.primary, 'line-width': 5 }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="roam-vehicle" data={vehicle}>
          <Layer
            type="line"
            id="roam-vehicle-line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': palette.mutedText, 'line-width': 5, 'line-dasharray': [1, 1.5] }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="roam-endpoints" data={markers}>
          <Layer
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
      </Map>
      {showSketch ? <RouteSketch route={route} vehicleRanges={vehicleRanges} live={live} /> : null}
    </View>
  );
});

const NO_RANGES: [number, number][] = [];

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 16 },
});
