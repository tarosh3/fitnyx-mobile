import { usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, Keyboard, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { FiloGlyph } from '@/src/components/art/FiloGlyph';
import { haptic } from '@/src/lib/haptics';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { motion, type } from '@/src/styles/tokens';
import { NavIcon, type NavIconName } from './NavIcon';
import { BOTTOM_NAV_HEIGHT, BOTTOM_NAV_LIFT, bottomNavGap, isBottomNavRoute } from './bottomNavLayout';

const destinations = [
  { key: 'home', label: 'Home', href: '/', match: (p: string) => p === '/' || p === '/roam' || p.startsWith('/roam/') || p === '/arena' || p === '/notifications' },
  { key: 'workouts', label: 'Workouts', href: '/workouts', match: (p: string) => p.startsWith('/workouts') || p.startsWith('/exercises') },
  { key: 'progress', label: 'Progress', href: '/dashboard', match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/') },
  { key: 'profile', label: 'Profile', href: '/me', match: (p: string) => p === '/me' || p.startsWith('/settings') || p === '/friends' },
] as const;

const SPRING = { damping: 20, stiffness: 320, mass: 0.7, reduceMotion: ReduceMotion.System };
const DOCK_PADDING = 6;

// The dock is a frosted-glass pill: content scrolled behind it shows through
// blurred, while the area above and beside the pill is left untouched. Reduce
// Transparency swaps the frost for the opaque nav surface.
export function BottomNav({ blurTarget }: { blurTarget?: RefObject<View | null> }) {
  const pathname = usePathname();
  const router = useRouter();
  const c = useThemeColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, onboardingComplete } = useAuth();
  const { openCenteredChat, isOpen: coachOpen } = useAICoach();
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const lastNavTime = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((v) => { if (active) setReduceTransparency(!!v); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => { active = false; sub.remove(); };
  }, []);

  const navigate = useCallback((href: string) => {
    if (pathname === href) return;
    const now = Date.now();
    if (now - lastNavTime.current < 300) return;
    lastNavTime.current = now;
    haptic.selection();
    if (router.canDismiss()) router.dismissAll();
    router.replace(href as never);
  }, [pathname, router]);

  if (!user || !onboardingComplete || keyboardVisible || coachOpen || !isBottomNavRoute(pathname)) return null;

  const gap = bottomNavGap(insets.bottom);
  // Match the app-wide 16px content margin so the dock lines up with every screen.
  const horizontalInset = 16;
  const leftInset = Math.max(insets.left, horizontalInset);
  const rightInset = Math.max(insets.right, horizontalInset);
  const availableWidth = width - leftInset - rightInset;
  const dockWidth = Math.min(420, availableWidth);
  const dockLeft = leftInset + (availableWidth - dockWidth) / 2;
  const totalHeight = BOTTOM_NAV_HEIGHT;

  const tab = (item: typeof destinations[number]) => (
    <DockItem key={item.key} id={item.key} label={item.label} active={item.match(pathname)}
      onPress={() => navigate(item.href)} />
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { height: totalHeight + gap + 24 }]}>
      {/* The pill is inset, so wide cards can peek in the margins beside it and
          in the gap below. Paint those areas (never behind the pill) with the
          page background: dark content was already invisible there, and this
          also hides bright content, while the pill keeps showing content through
          its frost. Nothing above the pill's top edge is covered. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: gap, backgroundColor: c.background }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: gap, width: dockLeft, height: totalHeight, backgroundColor: c.background }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: 0, bottom: gap, width: Math.max(0, width - dockLeft - dockWidth), height: totalHeight, backgroundColor: c.background }} />
      <View testID="bottom-nav" pointerEvents="box-none" style={[styles.dock, {
        bottom: gap, left: dockLeft, width: dockWidth, height: totalHeight,
        backgroundColor: reduceTransparency ? c.nav.surface : 'transparent',
        borderColor: c.nav.edge, shadowColor: c.nav.shadow,
      }]}>
        {!reduceTransparency && (
          <>
            {/* Frosted-glass pill: content behind the dock shows through, blurred. */}
            <BlurView pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glass]}
              tint={theme === 'light' ? 'systemChromeMaterialLight' : 'systemChromeMaterialDark'}
              intensity={64} blurReductionFactor={4} blurMethod="dimezisBlurViewSdk31Plus"
              blurTarget={blurTarget ?? undefined} />
            {/* A wash keeps icons/labels legible and stops bright content from
                bleeding through the pill's corners while keeping a subtle frost. */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glass,
              { backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.62)' : 'rgba(22,22,22,0.66)' }]} />
          </>
        )}
      </View>
      {/* Keep the raised button inside the row's hit area, above the glass. */}
      <View pointerEvents="box-none" style={[styles.row, {
        bottom: gap, left: dockLeft + DOCK_PADDING, width: dockWidth - DOCK_PADDING * 2,
      }]}>
        {destinations.slice(0, 2).map(tab)}
        <CoachAction onPress={() => { haptic.light(); openCenteredChat(); }} />
        {destinations.slice(2).map(tab)}
      </View>
    </View>
  );
}

function DockItem({ id, label, active, onPress }: {
  id: NavIconName; label: string; active: boolean; onPress: () => void;
}) {
  const c = useThemeColors();
  const press = useSharedValue(1);
  const selection = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    selection.value = withTiming(active ? 1 : 0, { duration: motion.duration.base, reduceMotion: ReduceMotion.System });
  }, [active, selection]);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const selectedStyle = useAnimatedStyle(() => ({ opacity: selection.value }));
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - selection.value }));

  return (
    <Pressable testID={`nav-${id}`} accessibilityRole="tab" accessibilityLabel={label}
      accessibilityState={{ selected: active }} onPress={onPress}
      onPressIn={() => { press.value = withTiming(0.92, { duration: motion.duration.fast, reduceMotion: ReduceMotion.System }); }}
      onPressOut={() => { press.value = withSpring(1, SPRING); }} style={styles.tab}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tabContent, pressStyle]}>
        <View style={styles.iconStage}>
          <Animated.View style={[styles.activePill, { backgroundColor: c.primary }, selectedStyle]} />
          <Animated.View style={[styles.iconLayer, inactiveStyle]}><NavIcon name={id} size={24} color={c.nav.inactive} fill={c.nav.iconFill} /></Animated.View>
          <Animated.View style={[styles.iconLayer, selectedStyle]}><NavIcon name={id} size={24} color={c.primaryText} fill={c.primary} /></Animated.View>
        </View>
        <Text accessible={false} numberOfLines={1} maxFontSizeMultiplier={1.2}
          style={[styles.label, { color: active ? c.nav.active : c.nav.inactive, fontFamily: active ? type.weight.bold : type.weight.medium }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function CoachAction({ onPress }: { onPress: () => void }) {
  const c = useThemeColors();
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <Pressable testID="nav-coach" accessibilityRole="button" accessibilityLabel="Open Filo, your AI coach"
      accessibilityHint="Opens your fitness coach conversation" onPress={onPress}
      onPressIn={() => { press.value = withTiming(0.94, { duration: motion.duration.fast, reduceMotion: ReduceMotion.System }); }}
      onPressOut={() => { press.value = withSpring(1, SPRING); }}
      style={[styles.tab, styles.coachTab]}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.coachContent, pressStyle]}>
        <View style={[styles.coachFab, { backgroundColor: c.primary, shadowColor: c.nav.shadow }]}>
          <FiloGlyph size={30} color={c.primaryText} ink={c.primary} />
        </View>
        <Text accessible={false} numberOfLines={1} maxFontSizeMultiplier={1.2}
          style={[styles.label, { color: c.nav.coachInk, fontFamily: type.weight.medium }]}>Coach</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50 },
  dock: { position: 'absolute', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  glass: { borderRadius: 20, overflow: 'hidden' },
  row: { position: 'absolute', height: BOTTOM_NAV_HEIGHT + BOTTOM_NAV_LIFT, flexDirection: 'row', alignItems: 'flex-end' },
  tab: { flex: 1, height: BOTTOM_NAV_HEIGHT, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  coachTab: { height: BOTTOM_NAV_HEIGHT + BOTTOM_NAV_LIFT },
  coachContent: { width: '100%', height: BOTTOM_NAV_HEIGHT + BOTTOM_NAV_LIFT, alignItems: 'center', gap: 2 },
  coachFab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  tabContent: { width: '100%', height: BOTTOM_NAV_HEIGHT, alignItems: 'center', paddingTop: 6, gap: 2 },
  iconStage: { width: 44, height: 30, alignItems: 'center', justifyContent: 'center' },
  iconLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: type.size.micro, lineHeight: 14, textAlign: 'center', maxWidth: '100%' },
  activePill: { ...StyleSheet.absoluteFillObject, borderRadius: 15 },
});
