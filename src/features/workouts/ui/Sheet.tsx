import { X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pinned under the content (e.g. the main action), always above the nav bar. */
  footer?: React.ReactNode;
  /**
   * The content scrolls when it's taller than the sheet (default), so nothing
   * ends up hidden under the footer. Pass false when the content has its own
   * list (FlatList / ScrollView) and lets it shrink instead.
   */
  scroll?: boolean;
  testID?: string;
}

/**
 * Bottom sheet used across the Workouts tab. Three ways out, so nobody gets
 * stuck: the ✕ button, swiping the top down, or tapping the dimmed area
 * (Android back too, via onRequestClose).
 */
export function Sheet({ visible, title, subtitle, onClose, children, footer, scroll = true, testID }: Props) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const drag = useRef(new Animated.Value(0)).current;
  // Keyboard height, padded under the sheet. KeyboardAvoidingView inside a Modal
  // left ~the home-indicator height of the sheet (its button) behind the keyboard.
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible) drag.setValue(0);
  }, [visible, drag]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 90 || g.vy > 1.2) onClose();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.fill, { paddingBottom: keyboard }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        {/* In normal flow (not position: absolute) inside the space above the keyboard,
            so the keyboard lifts it and its 90% max is of what's visible. */}
        <View style={styles.space} pointerEvents="box-none">
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { backgroundColor: c.card, borderColor: c.border, paddingBottom: (keyboard ? 0 : insets.bottom) + spacing.base, transform: [{ translateY: drag }] },
          ]}
        >
          <View {...pan.panHandlers}>
            <View style={[styles.grab, { backgroundColor: c.border }]} />
            <View style={styles.head}>
              <View style={styles.titles}>
                <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">{title}</Text>
                {subtitle ? <Text style={[styles.subtitle, { color: c.mutedText }]}>{subtitle}</Text> : null}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                style={({ pressed }) => [styles.close, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.7 }]}
              >
                <X size={22} color={c.text} />
              </Pressable>
            </View>
          </View>
          {scroll ? (
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  space: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
  },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingBottom: spacing.md },
  titles: { flex: 1, gap: 2, paddingTop: 4 },
  title: { fontFamily: type.weight.extrabold, fontSize: 22, letterSpacing: -0.3 },
  subtitle: { fontFamily: type.weight.regular, fontSize: 15 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  // Content-sized up to the sheet's maxHeight, then it shrinks (and scrolls).
  body: { flexGrow: 0, flexShrink: 1 },
  footer: { paddingTop: spacing.md, gap: spacing.sm },
});
