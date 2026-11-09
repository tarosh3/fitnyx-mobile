import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProTag } from '@/src/features/pro/ProTag';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** In place of a Pro feature for free users: what it does, and See Pro. */
export function ProUpsellCard({ title, body, testID }: { title: string; body: string; testID?: string }) {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID={testID}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <ProTag />
      </View>
      <Text style={[styles.body, { color: c.mutedText }]}>{body}</Text>
      <Button title="See Pro" variant="secondary" onPress={() => router.push('/pro')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontFamily: type.weight.bold, fontSize: 17 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
});
