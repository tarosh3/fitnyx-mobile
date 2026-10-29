import { Illustration } from '@/src/components/art/Illustration';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock, Target, TrendingUp, Zap } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

const PRIMARY = '#5FC793';

function DecoRings() {
  return (
    <View style={wStyles.decoContainer} pointerEvents="none">
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <G opacity={0.06}>
          <Circle cx={150} cy={150} r={60} stroke={PRIMARY} strokeWidth={1} fill="none" />
          <Circle cx={150} cy={150} r={90} stroke={PRIMARY} strokeWidth={0.8} fill="none" />
          <Circle cx={150} cy={150} r={120} stroke={PRIMARY} strokeWidth={0.5} fill="none" />
          <Circle cx={150} cy={150} r={148} stroke={PRIMARY} strokeWidth={0.3} fill="none" />
        </G>
      </Svg>
    </View>
  );
}

const PILLS = [
  { label: 'AI-Powered', icon: Zap },
  { label: 'Track Progress', icon: TrendingUp },
  { label: 'Custom Plans', icon: Target },
];

export function WelcomeStep({ onNext }: OnboardingStepProps) {
  const palette = useThemeColors();

  return (
    <View style={wStyles.wrap}>
      <DecoRings />

      <View style={wStyles.center}>
        <Animated.View entering={FadeIn.duration(600)}>
          <Illustration name="filo" size={144} />
        </Animated.View>

        <Animated.Text entering={FadeInDown.duration(500).delay(200)} style={[wStyles.title, { color: palette.text }]}>
          Let's <Text style={{ color: PRIMARY }}>personalize</Text>{'\n'}your fitness journey
        </Animated.Text>

        <Animated.Text entering={FadeInDown.duration(500).delay(350)} style={[wStyles.subtitle, { color: palette.mutedText }]}>
          Answer a few quick questions so we can create the perfect workout plan for you.
        </Animated.Text>

        {/* Feature pills */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={wStyles.pillRow}>
          {PILLS.map((pill, i) => {
            const Icon = pill.icon;
            return (
              <Animated.View
                key={pill.label}
                entering={FadeInDown.duration(400).delay(550 + i * 100)}
                style={wStyles.pill}
              >
                <Icon size={14} color={PRIMARY} strokeWidth={2.5} />
                <Text style={wStyles.pillText}>{pill.label}</Text>
              </Animated.View>
            );
          })}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(700)}>
        <Pressable
          onPress={() => onNext()}
          style={({ pressed }) => [wStyles.button, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
        >
          <Text style={wStyles.buttonText}>GET STARTED</Text>
        </Pressable>

        <View style={wStyles.footerRow}>
          <Clock size={13} color={palette.mutedText} strokeWidth={2} />
          <Text style={[wStyles.footer, { color: palette.mutedText }]}>Takes about 2 minutes</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const wStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  decoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '10%',
    left: 0,
    right: 0,
  },
  center: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    alignItems: 'center',
    borderColor: `${PRIMARY}35`,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${PRIMARY}0A`,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 16,
  },
  footer: {
    fontSize: 12,
    fontWeight: '600',
  },
});
