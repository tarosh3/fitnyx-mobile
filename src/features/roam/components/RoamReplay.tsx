import { LinearGradient } from 'expo-linear-gradient';
import type { FeatureCollection, Point } from 'geojson';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ElevationProfile } from '@/src/features/roam/components/ElevationProfile';
import { ReplayControls } from '@/src/features/roam/components/ReplayControls';
import { RouteMap } from '@/src/features/roam/components/RouteMap';
import { decodePolyline, formatDistance, formatDuration, formatSpeed } from '@/src/features/roam/geo';
import { buildTimeline, gradientExpression, kmMarkerStep, positionAt, rampColor } from '@/src/features/roam/replay';
import type { LngLatPair } from '@/src/features/roam/routeGeometry';
import { useReplayPlayer } from '@/src/features/roam/useReplayPlayer';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivityDetail } from '@/src/lib/api/activities';

/** The camera re-centres at most this often while following (smooth, not jittery). */
const FOLLOW_EVERY_MS = 400;

/**
 * A saved Roam's map, coloured by speed, with a replay: the route draws itself
 * at the pace it was travelled while distance, time and speed tick along.
 */
export function RoamReplay({ activity }: { activity: ActivityDetail }) {
  const c = useThemeColors();
  const route = useMemo(() => decodePolyline(activity.route_polyline), [activity.route_polyline]);
  const tl = useMemo(
    () =>
      buildTimeline({
        route,
        routeTimes: activity.route_times,
        vehicleRanges: activity.vehicle_ranges,
        distanceM: activity.distance_m,
        movingTimeSec: activity.moving_time_sec,
      }),
    [route, activity],
  );
  const player = useReplayPlayer(tl, activity.moving_time_sec);
  const [follow, setFollow] = useState(false);

  const at = tl ? positionAt(tl, player.position) : null;
  // ~250 gradient rebuilds across a replay is plenty; skip identical frames.
  const progressKey = at ? Math.round(at.progress * 400) / 400 : 1;
  const gradient = useMemo(
    () => (tl ? gradientExpression(tl, progressKey, c.routeRamp, c.mutedText) : undefined),
    [tl, progressKey, c.routeRamp, c.mutedText],
  );
  const kmMarks = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: (tl?.kms ?? [])
        .filter((k) => k.t <= player.position + 1e-6 && k.km % kmMarkerStep(tl?.kms.length ?? 0) === 0)
        .map((k) => ({ type: 'Feature', properties: { km: k.km }, geometry: { type: 'Point', coordinates: k.coord } })),
    }),
    [tl, player.position],
  );

  // Follow camera: re-centre on the playhead every FOLLOW_EVERY_MS.
  const [followAt, setFollowAt] = useState<{ coord: LngLatPair; bearing: number } | null>(null);
  const lastFollow = useRef(0);
  useEffect(() => {
    if (!follow || !player.active || !at) return setFollowAt(null);
    const now = Date.now();
    if (now - lastFollow.current >= FOLLOW_EVERY_MS || !player.playing) {
      lastFollow.current = now;
      setFollowAt({ coord: at.coord, bearing: at.bearing });
    }
  }, [follow, player.active, player.playing, at?.coord[0], at?.coord[1], at?.bearing]);

  if (!tl || !at) return <RouteMap route={route} vehicleRanges={activity.vehicle_ranges} style={styles.map} />;

  const showHead = player.active && player.position < tl.duration;
  const speedColor = at.inVehicle ? c.mutedText : rampColor(tl, at.speedMps, c.routeRamp);
  const rateNow = formatSpeed(at.speedMps > 0.3 ? at.speedMps : 0);

  return (
    <View style={styles.wrap}>
      <View>
        <RouteMap
          route={route}
          vehicleRanges={activity.vehicle_ranges}
          lineGradient={gradient}
          head={showHead ? { coord: at.coord, bearing: at.bearing, color: speedColor } : null}
          showDirection={!player.playing}
          follow={followAt}
          kmMarks={kmMarks}
          sketchProgress={player.active ? at.progress : undefined}
          controlsHidden={player.active}
          style={styles.map}
        />
        {player.active ? (
          <View style={[styles.hud, { backgroundColor: c.background }]} pointerEvents="none" accessibilityLiveRegion="polite">
            <Hud label="Distance" value={formatDistance(at.distanceM)} />
            <Hud label="Time" value={formatDuration(at.clockSec)} />
            <Hud
              label="Speed"
              value={at.inVehicle ? 'Vehicle' : rateNow}
              dot={speedColor}
            />
          </View>
        ) : null}
      </View>

      <ReplayControls player={player} duration={tl.duration} follow={follow} onToggleFollow={() => setFollow((f) => !f)} />

      <ElevationProfile
        route={route}
        elevations={activity.elevations}
        gainM={activity.elevation_gain_m}
        progress={player.active ? at.progress : null}
      />

      {/* Without timing every point has the same speed — a legend would mean nothing. */}
      {tl.timed ? (
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: c.mutedText }]}>Slower</Text>
          <LinearGradient colors={[...c.routeRamp]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.legendBar} />
          <Text style={[styles.legendText, { color: c.mutedText }]}>Faster</Text>
        </View>
      ) : (
        <Text style={[styles.note, { color: c.mutedText }]}>
          Recorded before replays had timing, so this one plays at an even pace.
        </Text>
      )}
    </View>
  );
}

function Hud({ label, value, dot }: { label: string; value: string; dot?: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.hudItem}>
      <View style={styles.hudValueRow}>
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <Text style={[styles.hudValue, { color: c.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={[styles.hudLabel, { color: c.mutedText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  map: { height: 340 },
  hud: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 8,
    opacity: 0.94,
  },
  hudItem: { flex: 1, alignItems: 'center' },
  hudValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hudValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hudLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  legendBar: { flex: 1, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '600' },
  note: { fontSize: 11, textAlign: 'center' },
});
