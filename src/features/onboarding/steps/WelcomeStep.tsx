import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { OnboardingStepProps } from '@/src/features/onboarding/types';

export function WelcomeStep({ onNext }: OnboardingStepProps) {
  const palette = useThemeColors();

  return (
    <View style={styles.wrap}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: `${palette.primary}1A` }]}> 
          <Sparkles size={44} color={palette.primary} />
        </View>
        <Text style={[styles.title, { color: palette.text }]}>Let&apos;s personalize your fitness journey</Text>
        <Text style={[styles.subtitle, { color: palette.mutedText }]}> 
          Answer a few quick questions so we can create the perfect workout plan for you.
        </Text>
      </View>

      <Button title="Get Started" onPress={() => onNext()} />
      <Text style={[styles.footer, { color: palette.mutedText }]}>This only takes about 2 minutes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  center: {
    alignItems: 'center',
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 94,
    justifyContent: 'center',
    marginBottom: 24,
    width: 94,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
});
