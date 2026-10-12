import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, type } from '@/src/styles/tokens';
import { colors } from '@/src/theme/colors';
import { AuthBrand } from './components/AuthBrand';

const palette = colors.dark;

export function AuthLanding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const heroWidth = Math.min(width, 650);
  const heroHeight = Math.max(280, Math.min(height * 0.47, 520));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        testID="auth-landing"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <Image
            source={require('../../../assets/images/auth-training-hero.jpg')}
            style={[styles.photo, { top: insets.top, width: heroWidth, height: heroWidth * 1402 / 1122 }]}
            resizeMode="cover"
            accessible={false}
          />
          {/* Scrims keep the wordmark legible and blend the photograph into the page. */}
          <LinearGradient
            colors={[palette.background, palette.background, 'rgba(10,10,10,0)', 'rgba(10,10,10,0)', palette.background]}
            locations={[0, Math.min(insets.top / heroHeight, 0.2), 0.38, 0.68, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.brand, { top: insets.top + spacing.base, left: Math.max(insets.left, spacing.xl) }]}>
            <AuthBrand />
          </View>
        </View>

        <View style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.base), paddingLeft: Math.max(insets.left, spacing.xl), paddingRight: Math.max(insets.right, spacing.xl) },
        ]}>
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>YOUR PACE. YOUR PROGRESS.</Text>
            <Text accessibilityRole="header" style={[styles.headline, width < 370 && styles.headlineCompact]}>
              SHOW UP.{'\n'}<Text style={styles.accent}>GET STRONGER.</Text>
            </Text>
            <Text style={styles.description}>
              Workouts, nutrition, and a little guidance.{'\n'}Everything you need to keep moving forward.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              testID="welcome-get-started"
              accessibilityRole="button"
              accessibilityLabel="Get started"
              onPress={() => router.push('/signup')}
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
            >
              <Text style={styles.primaryText}>Get started</Text>
              <ArrowRight size={21} strokeWidth={2} color={palette.primaryText} />
            </Pressable>
            <Pressable
              testID="welcome-login"
              accessibilityRole="button"
              accessibilityLabel="Already a member? Log in"
              onPress={() => router.push('/login')}
              style={({ pressed }) => [styles.login, pressed && styles.linkPressed]}
            >
              <Text style={styles.loginText}>Already a member? <Text style={styles.loginLink}>Log in</Text></Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  scroll: { flexGrow: 1 },
  hero: { width: '100%', maxWidth: 650, alignSelf: 'center', overflow: 'hidden', backgroundColor: palette.background },
  photo: { position: 'absolute' },
  brand: { position: 'absolute' },
  content: { flexGrow: 1, width: '100%', maxWidth: 528, alignSelf: 'center', paddingTop: spacing.sm },
  copy: { paddingBottom: spacing.xl },
  eyebrow: {
    color: palette.mutedText, fontFamily: type.weight.semibold, fontSize: 10,
    lineHeight: 16, letterSpacing: type.tracking.eyebrow, marginBottom: spacing.md,
  },
  headline: { color: palette.text, fontFamily: type.display.fontFamily, fontSize: 48, lineHeight: 57, letterSpacing: -0.4 },
  headlineCompact: { fontSize: 41, lineHeight: 50 },
  accent: { color: palette.primary },
  description: { color: palette.mutedText, fontFamily: type.weight.regular, fontSize: 14, lineHeight: 22, marginTop: spacing.base },
  actions: { marginTop: 'auto', gap: spacing.xs },
  primary: {
    minHeight: 56, paddingHorizontal: spacing.xl, paddingVertical: spacing.base, borderRadius: radii.lg,
    backgroundColor: palette.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  primaryPressed: { opacity: 0.85 },
  primaryText: { fontFamily: type.weight.bold, fontSize: 16, color: palette.primaryText },
  login: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  linkPressed: { opacity: 0.7 },
  loginText: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 22, color: palette.mutedText, textAlign: 'center' },
  loginLink: { fontFamily: type.weight.semibold, color: palette.text },
});
