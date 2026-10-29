import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';
import { useNotifications } from '../data';

/** Home header: opens the notifications, with the unread count. */
export function NotificationBell() {
  const c = useThemeColors();
  const router = useRouter();
  const { data } = useNotifications();
  const unread = data?.unread_count ?? 0;
  return (
    <Pressable testID="home-notifications" onPress={() => router.push('/notifications' as never)} hitSlop={8}
      accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'}
      style={({ pressed }) => [styles.button, { backgroundColor: c.card }, pressed && styles.pressed]}>
      <Bell size={21} color={c.text} strokeWidth={1.9} />
      {unread ? (
        <View style={[styles.badge, { backgroundColor: c.primary, borderColor: c.background }]}>
          <Text style={[styles.badgeText, { color: c.primaryText }]}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: type.weight.extrabold, fontSize: type.size.micro },
});
