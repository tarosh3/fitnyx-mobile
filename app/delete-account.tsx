import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function DeleteAccountScreen() {
  const palette = useThemeColors();

  return (
    <Screen>
      <PageHeader title="Delete Account & Data" subtitle="Facebook and direct deletion options" backTo="/settings" />

      <Card style={{ gap: 12 }}>
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Option 1: Remove FitNyx from Facebook</Text>
          <Text style={[styles.sectionBody, { color: palette.mutedText }]}>Go to Facebook Settings → Apps and Websites, remove FitNyx, and confirm data removal.</Text>
          <Button
            title="Open Facebook App Settings"
            variant="secondary"
            onPress={() => Linking.openURL('https://www.facebook.com/settings?tab=applications')}
          />
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Option 2: Request Manual Deletion</Text>
          <Text style={[styles.sectionBody, { color: palette.mutedText }]}>Email support@fitnyx.in with your account email and a request to permanently delete your account and all associated data.</Text>
          <Button
            title="Email Support"
            onPress={() =>
              Linking.openURL(
                'mailto:support@fitnyx.in?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20FitNyx%20account%20and%20all%20associated%20data.'
              )
            }
          />
        </View>

        <View style={[styles.notice, { borderColor: palette.border, backgroundColor: `${palette.card}DD` }]}>
          <Text style={{ color: palette.text, fontSize: 12, fontWeight: '700' }}>What gets deleted</Text>
          <Text style={{ color: palette.mutedText, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
            Profile information, workout plans, workout logs, nutrition plans, and AI chat history tied to your account.
          </Text>
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
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
