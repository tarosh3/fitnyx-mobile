import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

export const illustrations = {
  progress: require('../../../assets/images/illustrations/empty-progress.png'),
  roam: require('../../../assets/images/illustrations/empty-roam.png'),
  workouts: require('../../../assets/images/illustrations/empty-workouts.png'),
  history: require('../../../assets/images/illustrations/empty-history.png'),
  community: require('../../../assets/images/illustrations/empty-community.png'),
  start: require('../../../assets/images/illustrations/empty-start.png'),
  filo: require('../../../assets/images/illustrations/filo.png'),
};
export type IllustrationName = keyof typeof illustrations;

/** Decorative, bundled and offline. All meaning and actions remain native. */
export function Illustration({ name, size = 160 }: { name: IllustrationName; size?: number }) {
  return <Image source={illustrations[name]} resizeMode="contain" accessible={false}
    accessibilityIgnoresInvertColors style={{ width: size, height: size * (name === 'filo' ? 1 : 0.78), maxWidth: '100%', alignSelf: 'center' }} />;
}

export function IllustratedEmpty({ art = 'start', title, detail, action, onAction }: {
  art?: IllustrationName; title: string; detail?: string; action?: string; onAction?: () => void;
}) {
  const c = useThemeColors();
  return <View style={styles.empty}>
    <Illustration name={art} />
    <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{title}</Text>
    {detail ? <Text style={[styles.detail, { color: c.mutedText }]}>{detail}</Text> : null}
    {action && onAction ? <Pressable onPress={onAction} accessibilityRole="button"
      style={({ pressed }) => [styles.action, { backgroundColor: c.accentSoft, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.actionText, { color: c.accent }]}>{action}</Text>
    </Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  empty: { alignItems: 'center', padding: spacing.base, gap: spacing.sm },
  title: { fontFamily: type.weight.bold, fontSize: 18, lineHeight: 24, textAlign: 'center' },
  detail: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  action: { minHeight: 44, borderRadius: 14, paddingHorizontal: spacing.base, paddingVertical: spacing.md, justifyContent: 'center', marginTop: 4 },
  actionText: { fontFamily: type.weight.semibold, fontSize: 14, textAlign: 'center' },
});
