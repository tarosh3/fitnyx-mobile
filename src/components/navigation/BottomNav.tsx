import { usePathname, useRouter } from 'expo-router';
import { Dumbbell, Home, LayoutGrid, Settings, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { motion, spacing, type as t } from '@/src/styles/tokens';

const hiddenRoutePrefixes = [
  '/onboarding',
  '/settings',
  '/reminders',
  '/water',
  '/profile',
  '/fitness-profile',
  '/dashboard/stats',
  '/login',
  '/signup',
  '/workouts/customize',
  '/workouts/session',
  '/update-password',
  '/privacy-policy',
  '/terms-of-service',
  '/delete-account',
  '/email-verified',
  '/verification-failed',
  '/invite',
  '/access-expired',
];

type TabItem = {
  key: string;
  icon: typeof Home;
  label: string;
  isAi?: boolean;
  match?: (p: string) => boolean;
  onPress: () => void;
};

const DOT_SIZE = 8;
const BAR_HEIGHT = 76;
const TOP_RADIUS = 28;
const NOTCH_WIDTH = 64;  // total width of the curved dip
const NOTCH_DEPTH = 7;   // shallow dip
const DOT_HOVER = 9;     // dot floats this far above the deepest point of the curve

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { openCenteredChat } = useAICoach();
  const lastNavTime = useRef(0);

  const navigate = useCallback(
    (href: string, isActive: boolean) => {
      if (isActive) return;
      const now = Date.now();
      if (now - lastNavTime.current < 300) return;
      lastNavTime.current = now;
      router.replace(href as never);
    },
    [router]
  );

  const items: TabItem[] = [
    {
      key: 'home',
      icon: Home,
      label: 'Home',
      match: (p) => p === '/',
      onPress: () => navigate('/', pathname === '/'),
    },
    {
      key: 'workouts',
      icon: Dumbbell,
      label: 'Workouts',
      match: (p) => p.startsWith('/exercises'),
      onPress: () => navigate('/exercises', pathname.startsWith('/exercises')),
    },
    {
      key: 'ai',
      icon: Sparkles,
      label: 'Coach',
      isAi: true,
      onPress: openCenteredChat,
    },
    {
      key: 'stats',
      icon: LayoutGrid,
      label: 'Stats',
      match: (p) => p === '/dashboard' || p.startsWith('/dashboard/'),
      onPress: () =>
        navigate('/dashboard', pathname === '/dashboard' || pathname.startsWith('/dashboard/')),
    },
    {
      key: 'settings',
      icon: Settings,
      label: 'Settings',
      match: (p) => p.startsWith('/settings'),
      onPress: () => navigate('/settings', pathname.startsWith('/settings')),
    },
  ];

  const activeIndex = items.findIndex((it) => !it.isAi && it.match?.(pathname));

  const [width, setWidth] = useState(0);
  const [centers, setCenters] = useState<number[]>(Array(items.length).fill(0));
  const notchX = useSharedValue(0);

  useEffect(() => {
    if (activeIndex >= 0 && centers[activeIndex] > 0) {
      notchX.value = withSpring(centers[activeIndex], motion.spring.snappy);
    }
  }, [activeIndex, centers, notchX]);

  // Path describing the bar's outline w/ animated notch at notchX
  const animatedPath = useAnimatedProps(() => {
    const W = width;
    const H = BAR_HEIGHT;
    if (W === 0) return { d: '' };
    const x = notchX.value;
    const half = NOTCH_WIDTH / 2;
    const depth = NOTCH_DEPTH;

    // Build outline: start at top-left after corner, traverse top edge w/ dip, then around
    const d = [
      `M ${TOP_RADIUS} 0`,
      // top edge up to dip start
      `L ${x - half} 0`,
      // bezier down into dip
      `C ${x - half + 18} 0 ${x - 18} ${depth} ${x} ${depth}`,
      // bezier up out of dip
      `C ${x + 18} ${depth} ${x + half - 18} 0 ${x + half} 0`,
      // continue top edge
      `L ${W - TOP_RADIUS} 0`,
      // top-right corner
      `Q ${W} 0 ${W} ${TOP_RADIUS}`,
      // right edge
      `L ${W} ${H}`,
      // bottom edge
      `L 0 ${H}`,
      // left edge
      `L 0 ${TOP_RADIUS}`,
      // top-left corner
      `Q 0 0 ${TOP_RADIUS} 0`,
      'Z',
    ].join(' ');
    return { d };
  });

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: notchX.value - DOT_SIZE / 2 }],
    opacity: activeIndex >= 0 ? 1 : 0,
  }));

  const onTabLayout = (idx: number) => (e: LayoutChangeEvent) => {
    const { x, width: w } = e.nativeEvent.layout;
    const center = x + w / 2;
    setCenters((prev) => {
      if (Math.abs(prev[idx] - center) < 0.5) return prev;
      const next = [...prev];
      next[idx] = center;
      return next;
    });
  };

  if (!user) return null;
  if (hiddenRoutePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View
        style={styles.barFrame}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {/* SVG-drawn bar shape with animated notch */}
        {width > 0 ? (
          <Svg width={width} height={BAR_HEIGHT} style={StyleSheet.absoluteFill}>
            <AnimatedPath animatedProps={animatedPath} fill={c.card} stroke={c.border} strokeWidth={0.7} />
          </Svg>
        ) : null}

        {/* Floating dot — sits inside the notch */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dot,
            { backgroundColor: c.primary, shadowColor: c.primary },
            dotStyle,
          ]}
        />

        <View style={styles.row}>
          {items.map((item, idx) => {
            const isActive = !item.isAi && !!item.match?.(pathname);
            return (
              <Tab
                key={item.key}
                item={item}
                active={isActive}
                onLayout={onTabLayout(idx)}
                c={c}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Tab({
  item,
  active,
  onLayout,
  c,
}: {
  item: TabItem;
  active: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  const Icon = item.icon;
  const scale = useSharedValue(1);
  const lift = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    lift.value = withSpring(active ? 1 : 0, motion.spring.snappy);
  }, [active, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (1 + lift.value * 0.08) },
      { translateY: -lift.value * 2 },
    ],
  }));

  const color = item.isAi ? c.primary : active ? c.text : c.mutedText;
  const stroke = active || item.isAi ? 2.4 : 1.8;

  return (
    <Pressable
      onPress={item.onPress}
      onPressIn={() => (scale.value = withSpring(0.88, motion.spring.snappy))}
      onPressOut={() => (scale.value = withSpring(1, motion.spring.snappy))}
      onLayout={onLayout}
      style={styles.tab}
      hitSlop={6}
    >
      <Animated.View style={[styles.tabInner, iconStyle]}>
        {item.isAi ? (
          <View style={[styles.aiHalo, { backgroundColor: `${c.primary}1F` }]}>
            <Icon color={color} size={22} strokeWidth={stroke} />
          </View>
        ) : (
          <Icon color={color} size={22} strokeWidth={stroke} />
        )}
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color,
            fontFamily: active || item.isAi ? t.weight.bold : t.weight.medium,
          },
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  barFrame: {
    width: '100%',
    height: BAR_HEIGHT,
  },
  dot: {
    position: 'absolute',
    // Sit ABOVE the deepest point of the notch w/ a small gap so it visually hovers
    top: NOTCH_DEPTH - DOT_SIZE - DOT_HOVER,
    left: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: t.size.xs,
    letterSpacing: 0.2,
  },
});
