import { usePathname } from 'expo-router';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Keyboard, Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomNavClearance, isBottomNavRoute } from '@/src/components/navigation/bottomNavLayout';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { elevation, radii, spacing, type } from '@/src/styles/tokens';

/** success / error add an icon; info (the default) is text only. */
export type ToastTone = 'info' | 'success' | 'error';
type Show = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<Show>(() => undefined);
let showGlobal: Show | null = null;

/** For code outside the provider (the root back handler). Does nothing before it mounts. */
export const showToast: Show = (message, tone) => showGlobal?.(message, tone);

// Clears a screen's own bottom action bar (workouts Chrome `BottomBar`: 56 + paddings).
const ACTION_BAR_CLEARANCE = 56 + spacing.md * 2 + spacing.md;

/**
 * Short confirmations ("Timer started", "Saved Push") as a dark card above the
 * dock — never over a screen's header or back button. Renders under RN Modals,
 * so feedback inside a Sheet must stay in the sheet.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // The active-workout mini-player floats above the dock; stay above it too.
  const playerInset = useWorkoutOverlayInset();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [keyboard, setKeyboard] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const show = useCallback<Show>((message, tone = 'info') => {
    setToast({ message, tone });
    AccessibilityInfo.announceForAccessibility?.(message);
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
    }, tone === 'error' ? 3600 : 2600);
  }, [anim]);

  useEffect(() => {
    showGlobal = show;
    return () => { if (showGlobal === show) showGlobal = null; };
  }, [show]);

  const bottom = keyboard > 0
    ? keyboard + spacing.md
    : isBottomNavRoute(pathname) ? bottomNavClearance(insets.bottom) + (playerInset ? playerInset + spacing.sm : 0) + spacing.md : insets.bottom + ACTION_BAR_CLEARANCE;
  const Icon = toast?.tone === 'success' ? CircleCheck : toast?.tone === 'error' ? CircleAlert : null;
  const iconColor = toast?.tone === 'error' ? c.destructive : c.accent;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" accessibilityLiveRegion="polite"
          style={[styles.toast, elevation.md, {
            bottom, backgroundColor: c.card, borderColor: c.border, opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }]}>
          {Icon ? <Icon size={20} color={iconColor} /> : null}
          <Text style={[styles.text, { color: c.text }]}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', alignSelf: 'center', maxWidth: '90%', zIndex: 100,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flexShrink: 1, fontFamily: type.weight.semibold, fontSize: 15, lineHeight: 20 },
});
