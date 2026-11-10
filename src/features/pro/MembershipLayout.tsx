import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { spacing } from '@/src/styles/tokens';

/** Fixed navigation, a readable content width, and real space for the keyboard/player. */
export function MembershipLayout({ title, right, children, scrollRef }: {
  title: string; right?: React.ReactNode; children: React.ReactNode; scrollRef?: React.Ref<ScrollView>;
}) {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const playerInset = useWorkoutOverlayInset();
  const innerRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  const setScrollRef = useCallback((node: ScrollView | null) => {
    innerRef.current = node;
    if (typeof scrollRef === 'function') scrollRef(node);
    else if (scrollRef) scrollRef.current = node;
  }, [scrollRef]);
  const keyboardTop = useRef<number | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revealInput = useCallback(() => {
    if (keyboardTop.current === null) return;
    clearTimeout(revealTimer.current);
    // Both keyboard and viewport changes can arrive first. Measure after the last layout.
    revealTimer.current = setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput();
      input?.measureInWindow((_x, y, _width, height) => {
        if (keyboardTop.current === null) return;
        const overlap = y + height + 140 - keyboardTop.current;
        if (overlap > 0) innerRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
      });
    }, 150);
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardVisible(true);
      revealInput();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      clearTimeout(revealTimer.current);
      setKeyboardVisible(false);
    });
    return () => { show.remove(); hide.remove(); clearTimeout(revealTimer.current); };
  }, [revealInput]);
  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: c.background }]} behavior="padding" enabled={Platform.OS !== 'android' || keyboardVisible}>
      <TopBar title={title} right={right} onBack={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
      <ScrollView ref={setScrollRef} onLayout={revealInput} onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + playerInset + spacing['2xl'] }]}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.base },
});
