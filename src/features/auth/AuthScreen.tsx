import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useRef } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing } from '@/src/styles/tokens';
import { colors } from '@/src/theme/colors';
import { AuthForm, type AuthFormHandle } from './AuthForm';
import { AuthBrand } from './components/AuthBrand';

interface AuthScreenProps {
  mode: 'login' | 'signup';
  notice?: string | null;
}

/** The same keyboard-safe layout is used by welcome links and direct auth links. */
export function AuthScreen({ mode, notice }: AuthScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const form = useRef<AuthFormHandle>(null);

  // Back steps out of "reset password" / "check your inbox" to Log in before
  // leaving the screen — it used to drop the user on Welcome.
  const goBack = useCallback(() => {
    Keyboard.dismiss();
    if (form.current?.back()) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => form.current?.back() ?? false);
      return () => sub.remove();
    }, []),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable
          testID="auth-back"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ArrowLeft size={22} color={colors.dark.text} />
        </Pressable>
        <AuthBrand />
        <View style={styles.headerBalance} />
      </View>
      {/* Android draws edge-to-edge, so the window no longer shrinks for the
          keyboard: without padding here it covered the submit button, and
          scrolling to reach it closed the keyboard ('on-drag'). */}
      <KeyboardAvoidingView style={styles.keyboard} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
        >
          <View style={styles.form}>
            <AuthForm ref={form} key={mode} initialMode={mode} notice={notice} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark.background },
  header: {
    width: '100%', maxWidth: 528, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  back: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.dark.border,
  },
  pressed: { backgroundColor: colors.dark.card },
  headerBalance: { width: 48 },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing['2xl'] },
  form: { width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1 },
});
