import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { RouteHeatmap } from '@/src/features/roam/components/RouteHeatmap';
import { useRoamHeatmap } from '@/src/features/roam/useRoamHeatmap';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

export default function RoamHeatmapScreen() {
  const palette = useThemeColors();
  const { user } = useAuth();
  const { lines, failed } = useRoamHeatmap(user?.id);

  return (
    <Screen scroll={false} contentContainerStyle={styles.screen}>
      <PageHeader title="HEATMAP" subtitle={lines ? `${lines.length} ROAM${lines.length === 1 ? '' : 'S'} ON ONE MAP` : 'EVERY ROAM ON ONE MAP'} backTo="/roam" />
      {lines && lines.length > 0 ? (
        <RouteHeatmap lines={lines} style={styles.map} />
      ) : (
        <View style={styles.center}>
          {lines || failed ? (
            <Text style={[styles.note, { color: palette.mutedText }]}>
              {failed ? "Couldn't load your routes. Check your connection." : 'Your Roams will build up here — the streets you repeat glow brightest.'}
            </Text>
          ) : (
            <ActivityIndicator color={palette.primary} />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 14 },
  map: { flex: 1, marginBottom: 110 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  note: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
