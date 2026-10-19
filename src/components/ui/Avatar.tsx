import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** "Tarosh Mathuria" → "TM", "tarosh3" → "T". */
export function initialsOf(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** The profile photo, or initials when there is none (or it fails to load). */
export function Avatar({ uri, name, size, bg, fg, style }: {
  uri?: string | null; name?: string | null; size: number; bg?: string; fg?: string; style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = !!uri && failed !== uri;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.accentSoft }, style]}>
      {showPhoto ? (
        <Image source={{ uri }} style={{ width: size, height: size }} onError={() => setFailed(uri)} accessibilityIgnoresInvertColors />
      ) : (
        <Text allowFontScaling={false} style={[styles.initials, { fontSize: size * 0.36, color: fg ?? c.accent }]}>{initialsOf(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: type.weight.extrabold, letterSpacing: -0.3 },
});
