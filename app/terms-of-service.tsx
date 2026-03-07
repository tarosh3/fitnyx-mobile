import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const TERMS = [
  {
    title: '1. Acceptance',
    body: 'By using FitNyx, you agree to these terms. If you do not agree, you should stop using the service.',
  },
  {
    title: '2. Service Scope',
    body: 'FitNyx provides workout tracking, planning, analytics, and AI-driven fitness insights. It is not a medical service.',
  },
  {
    title: '3. Account Responsibility',
    body: 'You are responsible for maintaining account security and for all activity performed through your account.',
  },
  {
    title: '4. Health Disclaimer',
    body: 'FitNyx guidance, including AI-generated responses, is informational only and not medical advice. Consult licensed professionals before starting new programs.',
  },
  {
    title: '5. Acceptable Use',
    body: 'You may not misuse the service, attempt unauthorized access, or exploit the platform for unlawful activity.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'Use of FitNyx is at your own risk. To the maximum extent permitted by law, FitNyx is not liable for indirect or consequential damages.',
  },
  {
    title: '7. Changes to Terms',
    body: 'We may update these terms over time. Continued use of the platform constitutes acceptance of revised terms.',
  },
];

export default function TermsOfServiceScreen() {
  const palette = useThemeColors();

  return (
    <Screen>
      <PageHeader title="Terms of Service" subtitle="Last updated: February 16, 2026" backTo="/settings" />

      <Card style={{ gap: 10 }}>
        {TERMS.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: palette.primary }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: palette.mutedText }]}>{section.body}</Text>
          </View>
        ))}
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
