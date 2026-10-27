import { Car } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type } from '@/src/styles/tokens';

import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Shown when the track is moving at vehicle speed — that stretch won't count. */
export function VehicleBanner({ message }: { message: string }) {
  const palette = useThemeColors();
  return (
    <View style={[styles.banner, { backgroundColor: palette.card, borderColor: palette.warning }]}>
      <Car size={18} color={palette.warning} />
      <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  text: { flex: 1, fontSize: 13, fontFamily: type.weight.semibold },
});
