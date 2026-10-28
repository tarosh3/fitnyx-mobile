import { Illustration } from '@/src/components/art/Illustration';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

/** A friends board with nobody on it but you: two ways forward, not a lonely list. */
export function AloneCard({ onGlobal }: { onGlobal: () => void }) {
  const c = useThemeColors();
  const router = useRouter();
  return (
    <View testID="arena-alone" style={[styles.card, { borderColor: c.border }]}>
      <Illustration name="community" />
      <Text style={[styles.title, { color: c.text }]}>Better with friends</Text>
      <Text style={[styles.sub, { color: c.mutedText }]}>Add friends by username and see who trains hardest.</Text>
      {/* Secondary: the hero above already holds the screen's one primary action. */}
      <Button testID="arena-add-friends" title="Find friends" variant="secondary" onPress={() => router.push('/friends?tab=find' as never)} style={styles.button} />
      <Pressable testID="arena-see-global" onPress={onGlobal} accessibilityRole="button" hitSlop={8} style={styles.link}>
        <Text style={[styles.linkText, { color: c.accent }]}>See where you rank worldwide</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { fontFamily: type.weight.bold, fontSize: 18 },
  sub: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  button: { flexGrow: 0, alignSelf: 'stretch', marginTop: spacing.sm },
  link: { paddingVertical: spacing.sm },
  linkText: { fontFamily: type.weight.semibold, fontSize: 14 },
});
