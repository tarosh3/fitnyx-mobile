import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { ChartNoAxesColumnIncreasing, Dumbbell, Home, Settings, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { motion, type } from '@/src/styles/tokens';
import { BOTTOM_NAV_HEIGHT, bottomNavGap, isBottomNavRoute } from './bottomNavLayout';

const destinations = [
  { key: 'home', label: 'Home', icon: Home, href: '/', match: (p: string) => p === '/' || p === '/roam' || p.startsWith('/roam/') },
  { key: 'workouts', label: 'Workouts', icon: Dumbbell, href: '/workouts', match: (p: string) => p.startsWith('/workouts') || p.startsWith('/exercises') },
  { key: 'stats', label: 'Stats', icon: ChartNoAxesColumnIncreasing, href: '/dashboard', match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/') },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/settings', match: (p: string) => p.startsWith('/settings') },
] as const;

const SPRING = { damping: 22, stiffness: 290, mass: 0.8, reduceMotion: ReduceMotion.System };

export function BottomNav({ blurTarget }: { blurTarget?: RefObject<View | null> }) {
  const pathname = usePathname();
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, onboardingComplete } = useAuth();
  const { openCenteredChat, isOpen: coachOpen } = useAICoach();
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [railWidth, setRailWidth] = useState(0);
  const lastNavTime = useRef(0);
  const index = destinations.findIndex((d) => d.match(pathname));
  const cursor = useSharedValue(Math.max(index, 0));
  const stretch = useSharedValue(1);
  const previousIndex = useRef(index);

  useEffect(() => {
    cursor.value = withSpring(Math.max(index, 0), SPRING);
    if (index >= 0 && previousIndex.current >= 0 && index !== previousIndex.current) {
      stretch.value = withSequence(
        ReduceMotion.System,
        withTiming(1.08, { duration: 100, reduceMotion: ReduceMotion.System }),
        withSpring(1, SPRING),
      );
    }
    previousIndex.current = index;
  }, [cursor, index, stretch]);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((value) => { if (mounted) setReduceTransparency(value); }).catch(() => {});
    const transparency = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => { mounted = false; show.remove(); hide.remove(); transparency.remove(); };
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

  const cellWidth = Math.max(0, railWidth - 12) / 4;
  const cursorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cursor.value * cellWidth }, { scaleX: stretch.value }, { scaleY: 2 - stretch.value }],
  }));
  if (!user || !onboardingComplete || keyboardVisible || coachOpen || !isBottomNavRoute(pathname)) return null;

  const gap = bottomNavGap(insets.bottom);
  // Finish the fade at the dock's lower edge so the system gesture area stays clean.
  const fadeEnd = (BOTTOM_NAV_HEIGHT + 28) / (BOTTOM_NAV_HEIGHT + gap + 28);
  const canBlur = !reduceTransparency && (Platform.OS !== 'android' || (!!blurTarget && Number(Platform.Version) >= 31));
  const blurProps = { blurTarget, blurMethod: 'dimezisBlurViewSdk31Plus' as const, tint: c.background === '#0A0A0A' ? 'dark' as const : 'light' as const };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { height: BOTTOM_NAV_HEIGHT + gap + 28 }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LinearGradient colors={[`${c.background}00`, `${c.background}CC`, c.background]} locations={[0, 0.45, fadeEnd]} style={StyleSheet.absoluteFill} />
      </View>
      <View testID="bottom-nav" pointerEvents="box-none" style={[styles.dock, { bottom: gap, width: Math.min(520, width - Math.max(insets.left, width < 360 ? 12 : 20) - Math.max(insets.right, width < 360 ? 12 : 20)) }]}>
        <View style={[styles.railShadow, { shadowColor: c.nav.shadow }]}>
          <View style={[styles.rail, { borderColor: c.nav.edge }]} onLayout={(e) => setRailWidth(e.nativeEvent.layout.width)}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {canBlur ? <BlurView {...blurProps} intensity={70} style={StyleSheet.absoluteFill} /> : null}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: canBlur ? c.nav.glass : c.card }]} />
              <LinearGradient colors={['transparent', c.nav.highlight, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.railHighlight} />
            </View>
            {railWidth > 0 && index >= 0 ? (
              <Animated.View pointerEvents="none" testID="nav-selection" style={[styles.selection, { width: cellWidth - 4, borderColor: c.nav.selectedEdge }, cursorStyle]}>
                <LinearGradient colors={[c.nav.selectedFrom, c.nav.selectedTo]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={[styles.selectionHighlight, { backgroundColor: c.nav.selectedEdge }]} />
              </Animated.View>
            ) : null}
            {destinations.map((item, position) => (
              <DockItem key={item.key} id={item.key} label={item.label} icon={item.icon}
                active={item.match(pathname)} cursor={cursor} position={position} hasSelection={index >= 0}
                onPress={() => navigate(item.href)} compact={width < 360} />
            ))}
          </View>
        </View>
        <CoachAction compact={width < 360} onPress={() => { haptic.light(); openCenteredChat(); }} />
      </View>
    </View>
  );
}

function DockItem({ id, label, icon: Icon, active, cursor, position, hasSelection, onPress, compact }: {
  id: string; label: string; icon: typeof Home; active: boolean; cursor: SharedValue<number>;
  position: number; hasSelection: boolean; onPress: () => void; compact: boolean;
}) {
  const c = useThemeColors();
  const press = useSharedValue(1);
  // Ink follows the moving surface, keeping each icon readable throughout the transition.
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: hasSelection ? Math.min(1, Math.abs(cursor.value - position)) : 1 }));
  const selectedStyle = useAnimatedStyle(() => ({ opacity: hasSelection ? Math.max(0, 1 - Math.abs(cursor.value - position)) : 0 }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const content = (selected: boolean) => (
    <>
      <Icon size={23} strokeWidth={selected ? 2.2 : 1.7} color={selected ? c.nav.selectedInk : c.nav.inactive} accessible={false} />
      <Text accessible={false} numberOfLines={1} maxFontSizeMultiplier={1.25} adjustsFontSizeToFit minimumFontScale={0.85}
        style={[styles.label, compact && styles.compactLabel, { color: selected ? c.nav.selectedInk : c.nav.inactive, fontFamily: selected ? type.weight.bold : type.weight.medium }]}>{label}</Text>
    </>
  );
  return (
    <Pressable testID={`nav-${id}`} accessibilityRole="tab"
      accessibilityLabel={label} accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={() => { press.value = withTiming(0.88, { duration: motion.duration.fast, reduceMotion: ReduceMotion.System }); }}
      onPressOut={() => { press.value = withSpring(1, SPRING); }} style={styles.tab}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tabContent, pressStyle]}>
        <Animated.View style={[styles.tabFace, inactiveStyle]}>{content(false)}</Animated.View>
        <Animated.View style={[styles.tabFace, selectedStyle]}>{content(true)}</Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function CoachAction({ onPress, compact }: { onPress: () => void; compact: boolean }) {
  const c = useThemeColors();
  const press = useSharedValue(1);
  const surfaceStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${(1 - press.value) * 120}deg` }] }));
  return (
    <Animated.View style={[styles.coach, { backgroundColor: c.nav.coachTo, borderColor: c.nav.coachEdge }, surfaceStyle]}>
      <LinearGradient pointerEvents="none" colors={[c.nav.coachFrom, c.nav.coachTo]} style={StyleSheet.absoluteFill} />
      <Pressable testID="nav-coach" accessibilityRole="button" accessibilityLabel="Open Filo, your AI coach" onPress={onPress}
        onPressIn={() => { press.value = withTiming(0.94, { duration: motion.duration.fast, reduceMotion: ReduceMotion.System }); }}
        onPressOut={() => { press.value = withSpring(1, SPRING); }} style={styles.tab}>
        <Animated.View style={[styles.coachLens, { backgroundColor: c.nav.coachLens, borderColor: c.nav.coachEdge }, lensStyle]}>
          <Sparkles size={22} strokeWidth={1.8} color={c.nav.coachInk} accessible={false} />
        </Animated.View>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={[styles.label, compact && styles.compactLabel, { color: c.nav.coachInk, fontFamily: type.weight.semibold }]}>Coach</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50 },
  dock: { position: 'absolute', alignSelf: 'center', height: BOTTOM_NAV_HEIGHT, flexDirection: 'row', gap: 10 },
  railShadow: { flex: 1, borderRadius: 27, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  rail: { flex: 1, flexDirection: 'row', padding: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 27, overflow: 'hidden' },
  railHighlight: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  selection: { position: 'absolute', left: 8, top: 7, bottom: 7, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  selectionHighlight: { position: 'absolute', top: 0, left: 14, right: 14, height: 1 },
  coach: { width: 62, borderRadius: 25, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 6, overflow: 'hidden' },
  coachLens: { width: 34, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  tab: { flex: 1, minWidth: 44, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabContent: { width: '100%', height: 54 },
  tabFace: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 5 },
  label: { fontSize: 10, lineHeight: 14, textAlign: 'center', width: '88%' },
  compactLabel: { fontSize: 9 },
});
