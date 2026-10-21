import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** Back button + title for full-screen Workouts flows. */
export function TopBar({ title, subtitle, right, onBack, backLabel = 'Back' }: {
  title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void; backLabel?: string;
}) {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.top, { paddingTop: insets.top + spacing.sm, backgroundColor: c.background }]}>
      <Pressable onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/workouts')))} accessibilityRole="button"
        accessibilityLabel={backLabel} hitSlop={6} style={({ pressed }) => [styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
        <ChevronLeft size={24} color={c.text} />
      </Pressable>
      <View style={styles.titles}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: c.mutedText }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Round icon button used in top bars. */
export function IconButton({ onPress, label, children, tone }: { onPress: () => void; label: string; children: React.ReactNode; tone?: 'primary' }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, tone === 'primary' ? { backgroundColor: c.primary, borderColor: c.primary } : { backgroundColor: c.card, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

/** Action bar pinned to the bottom, always above the system navigation bar. */
export function BottomBar({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md, backgroundColor: c.background, borderColor: c.border }]}>{children}</View>
  );
}

/** Height a scroll view needs at its end so content clears a BottomBar. */
export function useBottomBarSpace(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + 56 + spacing.md * 2 + spacing.lg;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, testID }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'quiet'; icon?: React.ReactNode;
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const c = useThemeColors();
  const bg = variant === 'primary' ? c.primary : variant === 'quiet' ? 'transparent' : c.card;
  const fg = variant === 'primary' ? c.primaryText : variant === 'danger' ? c.destructive : variant === 'quiet' ? c.mutedText : c.text;
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg }, (variant === 'secondary' || variant === 'danger') && { borderWidth: 1, borderColor: c.border },
        variant === 'quiet' && { minHeight: 48 }, disabled && { opacity: 0.45 }, pressed && !disabled && { transform: [{ scale: 0.97 }] }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon}<Text style={[styles.btnText, { color: fg }, variant === 'quiet' && { fontSize: 16, fontFamily: type.weight.semibold }]}>{title}</Text></>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  iconBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  titles: { flex: 1, minWidth: 0 },
  title: { fontFamily: type.weight.bold, fontSize: 18 },
  subtitle: { fontFamily: type.weight.regular, fontSize: 13 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: spacing.md, paddingHorizontal: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm + 2 },
  // Grows to fill a BottomBar row, but keeps its natural size as a basis: `flex: 1`
  // (basis 0) made a Sheet footer count it as 0 pt tall, so tall content ran under it.
  btn: { minHeight: 56, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, flexGrow: 1, flexShrink: 1 },
  btnText: { flexShrink: 1, textAlign: 'center', fontFamily: type.weight.bold, fontSize: 17 },
});
