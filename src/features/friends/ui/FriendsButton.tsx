import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useFriends } from '../data';

/** The profile's way into Friends: friend count, plus a dot when requests wait. */
export function FriendsButton({ compact = false }: { compact?: boolean }) {
  const c = useThemeColors();
  const router = useRouter();
  const { data } = useFriends();
  const count = data?.friends.length ?? 0;
  const waiting = data?.incoming_count ?? 0;
  const label = count ? `Friends · ${count.toLocaleString('en-US')}` : 'Friends';
  return (
    <Pressable testID="open-friends" onPress={() => router.push((waiting ? '/friends?tab=requests' : '/friends') as never)}
      accessibilityRole="button" accessibilityLabel={waiting ? `${label}, ${waiting} new requests` : label}
      style={[styles.button, { backgroundColor: c.card, borderColor: c.border }]}>
      <Users size={17} color={c.text} strokeWidth={2} />
      <Text style={[styles.text, { color: c.text }, compact && { fontSize: 13 }]} numberOfLines={1}>{compact ? 'Friends' : label}</Text>
      {waiting ? (
        <View style={[styles.badge, { backgroundColor: c.primary }]}>
          <Text style={[styles.badgeText, { color: c.primaryText }]}>{waiting > 99 ? '99+' : waiting}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  text: { fontFamily: type.weight.bold, fontSize: 14, flexShrink: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: type.weight.extrabold, fontSize: 11 },
});
