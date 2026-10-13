import { usePathname, useRouter } from 'expo-router';
import { ChartNoAxesColumnIncreasing, Dumbbell, Home, Settings, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { elevation, motion, spacing, type } from '@/src/styles/tokens';
import { BOTTOM_NAV_HEIGHT, BOTTOM_NAV_LIFT, bottomNavGap, isBottomNavRoute } from './bottomNavLayout';

const destinations = [
  { key: 'home', label: 'Home', icon: Home, href: '/', match: (p: string) => p === '/' },
  { key: 'workouts', label: 'Workouts', icon: Dumbbell, href: '/exercises', match: (p: string) => p.startsWith('/exercises') || p.startsWith('/workouts') || p === '/roam' || p.startsWith('/roam/') },
  { key: 'stats', label: 'Stats', icon: ChartNoAxesColumnIncreasing, href: '/dashboard', match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/') },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/settings', match: (p: string) => p.startsWith('/settings') },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { openCenteredChat } = useAICoach();
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  const lastNavTime = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const navigate = useCallback((href: string) => {
    if (pathname === href) return;
    const now = Date.now();
    if (now - lastNavTime.current < 300) return;
    lastNavTime.current = now;
    // Selecting a destination starts a fresh stack, including from its sub-pages.
    if (router.canDismiss()) router.dismissAll();
    router.replace(href as never);
  }, [pathname, router]);

  if (!user || keyboardVisible || !isBottomNavRoute(pathname)) return null;

  const renderTab = (item: typeof destinations[number]) => (
    <DockItem key={item.key} id={item.key} label={item.label} icon={item.icon}
      active={item.match(pathname)} onPress={() => navigate(item.href)} compact={width < 360} />
  );

  return (
    <View pointerEvents="box-none" style={[
      styles.wrap,
      { bottom: bottomNavGap(insets.bottom), paddingLeft: Math.max(insets.left, width < 360 ? 12 : 16), paddingRight: Math.max(insets.right, width < 360 ? 12 : 16) },
    ]}>
      <View testID="bottom-nav" style={styles.dock}>
        <View pointerEvents="none" style={[styles.dockSurface, { backgroundColor: palette.card, borderColor: palette.border }]} />
        {destinations.slice(0, 2).map(renderTab)}
        <DockItem id="coach" label="Coach" icon={Sparkles} active={false} coach onPress={openCenteredChat} compact={width < 360} />
        {destinations.slice(2).map(renderTab)}
      </View>
    </View>
  );
}

function DockItem({ id, label, icon: Icon, active, coach = false, onPress, compact }: {
  id: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  coach?: boolean;
  onPress: () => void;
  compact: boolean;
}) {
  const palette = useThemeColors();
  const selection = useSharedValue(active ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    selection.value = withTiming(active ? 1 : 0, { duration: motion.duration.fast, reduceMotion: ReduceMotion.System });
  }, [active, selection]);

  const selectedStyle = useAnimatedStyle(() => ({ opacity: selection.value }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const color = active ? palette.accent : palette.mutedText;

  return (
    <Pressable
      testID={`nav-${id}`}
      accessibilityRole={coach ? 'button' : 'tab'}
      accessibilityLabel={coach ? 'Open Filo, your AI coach' : label}
      accessibilityState={coach ? undefined : { selected: active }}
      onPress={onPress}
      onPressIn={() => { press.value = withSpring(0.94, { ...motion.spring.snappy, reduceMotion: ReduceMotion.System }); }}
      onPressOut={() => { press.value = withSpring(1, { ...motion.spring.snappy, reduceMotion: ReduceMotion.System }); }}
      style={[styles.tab, coach && styles.coachTab]}
    >
      <Animated.View style={[styles.tabContent, pressStyle]}>
        {!coach && <Animated.View pointerEvents="none" style={[styles.selection, { backgroundColor: palette.accentSoft }, selectedStyle]} />}
        {coach ? (
          <View style={[styles.coachMount, { backgroundColor: palette.card }]}>
            <View style={[styles.coachButton, { backgroundColor: palette.primary }]}>
              <Icon size={25} strokeWidth={1.9} color={palette.primaryText} accessible={false} />
            </View>
          </View>
        ) : (
          <View style={styles.iconSlot}>
            <Icon size={23} strokeWidth={active ? 2.25 : 1.75} color={color} accessible={false} />
          </View>
        )}
        <Text numberOfLines={1} maxFontSizeMultiplier={1.25} adjustsFontSizeToFit minimumFontScale={0.85}
          style={[styles.label, compact && styles.compactLabel, {
            color: coach ? palette.text : color,
            fontFamily: active || coach ? type.weight.semibold : type.weight.medium,
          }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 50, alignItems: 'center' },
  dock: { width: '100%', maxWidth: 520, height: BOTTOM_NAV_HEIGHT + BOTTOM_NAV_LIFT, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.sm, paddingBottom: 6 },
  dockSurface: { position: 'absolute', top: BOTTOM_NAV_LIFT, bottom: 0, left: 0, right: 0, borderWidth: 1, borderRadius: 26, ...elevation.sm },
  tab: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  coachTab: { height: 74, justifyContent: 'flex-end' },
  tabContent: { width: '100%', height: 60, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 7, gap: 3 },
  selection: { position: 'absolute', top: 0, bottom: 0, left: 2, right: 2, borderRadius: 18 },
  iconSlot: { height: 29, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 15, textAlign: 'center', width: '100%', paddingHorizontal: 1 },
  compactLabel: { fontSize: 10 },
  coachMount: { position: 'absolute', top: -14, width: 56, height: 56, padding: 4, borderRadius: 22 },
  coachButton: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
