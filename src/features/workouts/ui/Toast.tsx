import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

const ToastContext = createContext<(message: string) => void>(() => undefined);

/** Short confirmations ("Timer started", "Saved Push") at the top of the screen. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    AccessibilityInfo.announceForAccessibility?.(text);
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMessage(null));
    }, 2400);
  }, [opacity]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <Animated.View pointerEvents="none" style={[styles.toast, { top: insets.top + spacing.md, backgroundColor: c.text, opacity }]}>
          <Text style={[styles.text, { color: c.background }]}>{message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '88%', borderRadius: radii.md + 2, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, zIndex: 100 },
  text: { fontFamily: type.weight.semibold, fontSize: 15, textAlign: 'center' },
});
