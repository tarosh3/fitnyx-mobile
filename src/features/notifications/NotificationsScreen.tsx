import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { Empty } from '@/src/features/progress/ui/bits';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { AppNotification } from '@/src/lib/api/notifications';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useNotifications } from './data';
import { notificationTarget, notificationText, sinceLabel } from './model';

/** Friend requests, acceptances and "passed you". Opening it marks everything read; new ones stay tinted until you leave. */
export function NotificationsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { data, loading, refresh: reload, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  // Ids that arrived unread while the screen is open: they stay highlighted after the badge clears.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const list = data?.notifications;

  // Whenever unread ones show up (the cached copy, then the focus refresh), remember and mark them read.
  useEffect(() => {
    if (!data || data.unread_count === 0) return;
    const unread = data.notifications.filter((x) => !x.read).map((x) => x.id);
    setFresh((prev) => new Set([...prev, ...unread]));
    markAllRead();
  }, [data, markAllRead]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <Pressable onPress={() => router.push(notificationTarget(item) as never)} accessibilityRole="button"
      style={({ pressed }) => [styles.row, fresh.has(item.id) && { backgroundColor: c.accentSoft }, pressed && styles.pressed]}>
      <Avatar uri={item.actor.avatar_url || null} name={item.actor.name || item.actor.username} size={44} />
      <Text style={[styles.text, { color: c.text }]}>{notificationText(item)}</Text>
      <Text style={[styles.when, { color: c.mutedText }]}>{sinceLabel(item.created_at)}</Text>
    </Pressable>
  );

  return (
    <Screen scroll={false} contentContainerStyle={styles.content}>
      <PageHeader title="Notifications" backTo="/" />
      {!list ? (
        loading ? <ActivityIndicator style={styles.spinner} color={c.accent} /> : <Empty text="Notifications need a connection the first time." />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Empty text="Nothing yet. Friend requests and Arena moves show up here." />
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  spinner: { marginTop: spacing.xl },
  list: { paddingBottom: spacing['2xl'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radii.md },
  pressed: { opacity: 0.8 },
  text: { flex: 1, fontFamily: type.weight.regular, fontSize: 15, lineHeight: 20 },
  when: { fontFamily: type.weight.medium, fontSize: 12 },
  empty: { marginTop: spacing.lg },
});
