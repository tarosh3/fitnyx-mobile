import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Thin, crash-safe wrapper around expo-haptics. No-ops on web and swallows any
// platform errors so haptics never break a flow.
function run(fn: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  try {
    void fn();
  } catch {
    // ignore — haptics are best-effort
  }
}

export const haptic = {
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
