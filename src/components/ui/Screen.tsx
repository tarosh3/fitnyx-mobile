import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { bottomNavClearance, isBottomNavRoute } from '@/src/components/navigation/bottomNavLayout';

interface ScreenProps {
  children?: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, contentContainerStyle, style }: ScreenProps) {
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const workoutInset = useWorkoutOverlayInset();
  const requestedBottom = StyleSheet.flatten(contentContainerStyle)?.paddingBottom;
  const navigationPadding = isBottomNavRoute(pathname) ? {
    paddingBottom: Math.max(typeof requestedBottom === 'number' ? requestedBottom : 100, bottomNavClearance(insets.bottom) + 16) + workoutInset,
  } : undefined;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: palette.background,
    paddingTop: insets.top + 24, // Universal offset from safe area
    paddingHorizontal: 16, // Premium horizontal margin
  };

  return (
    <View style={[containerStyle, style]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContainer, contentContainerStyle, navigationPadding]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContainer, contentContainerStyle, navigationPadding]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
});
