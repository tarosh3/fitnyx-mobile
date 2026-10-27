import { Minus, Mountain, Navigation, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  /** Live recording: also offer heading-up. */
  live: boolean;
  /** Hide the top-right buttons (the replay's stats overlay the top); zoom stays. */
  topHidden?: boolean;
  headingUp: boolean;
  onToggleHeadingUp: () => void;
  terrain: boolean;
  /** Omitted when terrain isn't available (the backup basemap). */
  onToggleTerrain?: () => void;
  /** Tilted 3D view (vs flat). */
  tilted: boolean;
  onToggleTilt: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

/**
 * The Roam map's buttons, all on the right like a navigation app:
 * heading-up (live), terrain and 3D/2D at the top; zoom in/out as one pill
 * above the attribution button, with 3D/2D above it while the top is hidden.
 */
export function MapControls(p: Props) {
  const palette = useThemeColors();
  const tilt = (
    <MapButton label={p.tilted ? 'Flat map view' : '3D map view'} selected={p.tilted} onPress={p.onToggleTilt}>
      {/* Shows what a tap switches to. */}
      <Text style={[styles.tiltText, { color: p.tilted ? palette.primary : palette.text }]}>{p.tilted ? '2D' : '3D'}</Text>
    </MapButton>
  );
  return (
    <>
      {p.topHidden ? null : (
        <View style={styles.column}>
          {p.live ? (
            <MapButton
              label={p.headingUp ? 'Map faces north' : 'Map turns with you'}
              selected={p.headingUp}
              onPress={p.onToggleHeadingUp}
            >
              <Navigation size={18} color={p.headingUp ? palette.primary : palette.text} fill={p.headingUp ? palette.primary : 'none'} />
            </MapButton>
          ) : null}
          {p.onToggleTerrain ? (
            <MapButton label={p.terrain ? 'Hide terrain' : 'Show terrain'} selected={p.terrain} onPress={p.onToggleTerrain}>
              <Mountain size={18} color={p.terrain ? palette.primary : palette.text} />
            </MapButton>
          ) : null}
          {tilt}
        </View>
      )}
      <View style={styles.bottomRight}>
        {/* With the top hidden (replay stats), 3D/2D moves here — the flyover is where it matters most. */}
        {p.topHidden ? tilt : null}
        <View style={[styles.zoom, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Pressable onPress={p.onZoomIn} accessibilityRole="button" accessibilityLabel="Zoom in" hitSlop={4} style={styles.zoomButton}>
            <Plus size={18} color={palette.text} />
          </Pressable>
          <View style={[styles.zoomRule, { backgroundColor: palette.border }]} />
          <Pressable onPress={p.onZoomOut} accessibilityRole="button" accessibilityLabel="Zoom out" hitSlop={4} style={styles.zoomButton}>
            <Minus size={18} color={palette.text} />
          </Pressable>
        </View>
      </View>
    </>
  );
}

function MapButton({ label, selected, onPress, children }: { label: string; selected: boolean; onPress: () => void; children: React.ReactNode }) {
  const palette = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={6}
      style={[styles.button, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', top: 12, right: 12, gap: 10 },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiltText: { fontSize: 13, fontFamily: type.weight.extrabold },
  // Clears MapLibre's attribution button in the bottom-right corner.
  bottomRight: { position: 'absolute', right: 12, bottom: 52, gap: 10 },
  zoom: { width: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  zoomButton: { height: 40, alignItems: 'center', justifyContent: 'center' },
  zoomRule: { height: StyleSheet.hairlineWidth, marginHorizontal: 8 },
});
