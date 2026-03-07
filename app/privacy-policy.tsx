import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect account details (name, email), onboarding information (age, height, weight, goals), workout logs, nutrition preferences, and AI coach conversations when you use FitNyx.',
  },
  {
    title: '2. How We Use Data',
    body: 'We use your data to personalize workouts, calculate progress analytics, generate nutrition plans, and provide AI coaching responses. We do not sell personal data.',
  },
  {
    title: '3. AI Processing',
    body: 'AI responses may use relevant profile and activity data to generate personalized guidance. AI output is informational and is not medical advice.',
  },
  {
    title: '4. Data Retention & Deletion',
    body: 'We retain your data while your account is active and as required by law. You can request account deletion and data removal through support.',
  },
  {
    title: '5. Security',
    body: 'We use reasonable administrative and technical safeguards to protect your data, but no system can guarantee absolute security.',
  },
  {
    title: '6. Your Rights',
    body: 'Depending on your location, you may request access, correction, deletion, or portability of your personal data.',
  },
];

export default function PrivacyPolicyScreen() {
  const palette = useThemeColors();

  return (
    <Screen>
      <PageHeader title="Privacy Policy" subtitle="Last updated: February 16, 2026" backTo="/settings" />

      <Card style={{ gap: 10 }}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: palette.primary }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: palette.mutedText }]}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Contact</Text>
          <Text style={[styles.sectionBody, { color: palette.mutedText }]}>For privacy requests: support@fitnyx.in</Text>
          <Pressable onPress={() => Linking.openURL('mailto:support@fitnyx.in')}>
            <Text style={{ color: palette.text, fontSize: 13, fontWeight: '700' }}>Email Support</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
  },
});
