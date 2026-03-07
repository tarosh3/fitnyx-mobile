import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';

interface ScreenProps {
  children?: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, contentContainerStyle, style }: ScreenProps) {
  const palette = useThemeColors();
  const insets = useSafeAreaInsets();

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
          contentContainerStyle={[styles.scrollContainer, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContainer, contentContainerStyle]}>{children}</View>
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
