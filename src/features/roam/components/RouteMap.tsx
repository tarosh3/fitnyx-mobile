import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { MAP_STYLE_URL } from '@/src/features/roam/mapStyle';
import { endpoints, routeBounds, routeLine, vehicleLines, type LngLatPair } from '@/src/features/roam/routeGeometry';
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

export function RouteMap({ route, vehicleRanges = [], live = false, style }: RouteMapProps) {
  const palette = useThemeColors();
  const { theme } = useTheme();

  const line = useMemo(() => routeLine(route), [route]);
  const vehicle = useMemo(() => vehicleLines(route, vehicleRanges), [route, vehicleRanges]);
  const markers = useMemo(() => endpoints(route, !live), [route, live]);
  const bounds = useMemo(() => routeBounds(route), [route]);
  const last = route[route.length - 1];

  return (
    <View style={[styles.wrap, style]}>
      <Map style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE_URL[theme]} logo={false} compass={false}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 16 },
});
