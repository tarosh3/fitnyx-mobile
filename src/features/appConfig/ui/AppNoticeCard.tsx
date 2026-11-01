import { Download, Info, TriangleAlert, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { radii, spacing, type } from '@/src/styles/tokens';
import { useAppNotices } from '../store';

/** Home: the admin's banner and "update available", each closable until it changes. */
export function AppNoticeCard() {
  const c = useThemeColors();
  const { softUpdate, banner } = useAppNotices();
  const notices = [
    softUpdate && {
      id: `update:${softUpdate.version}`,
      icon: Download,
      tint: c.accent,
      bg: c.accentSoft,
      message: 'A new version of FitNyx is available.',
      action: { label: 'Update', onPress: () => { void Linking.openURL(softUpdate.url).catch(() => undefined); } },
    },
    banner && {
      id: `banner:${banner.message}`,
      icon: banner.level === 'warning' ? TriangleAlert : Info,
      tint: banner.level === 'warning' ? c.warning : c.accent,
      bg: c.card,
      message: banner.message,
      action: null,
    },
  ].filter(Boolean) as Notice[];

  return <>{notices.map((n) => <NoticeRow key={n.id} notice={n} />)}</>;
}

interface Notice {
  id: string;
  icon: typeof Info;
  tint: string;
  bg: string;
  message: string;
  action: { label: string; onPress: () => void } | null;
}

function NoticeRow({ notice }: { notice: Notice }) {
  const c = useThemeColors();
  const key = cacheKeys.appNoticeDismissed(notice.id);
  // Hidden until we know it wasn't closed before, so a closed notice never flashes.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    cacheGetStale<boolean>(key).then((v) => { if (alive) setDismissed(Boolean(v)); }).catch(() => { if (alive) setDismissed(false); });
    return () => { alive = false; };
  }, [key]);
  if (dismissed !== false) return null;

  const Icon = notice.icon;
  const close = () => {
    setDismissed(true);
    cacheSet(key, true, cacheTTL.DAY * 365).catch(() => undefined);
  };
  return (
    <View testID="app-notice" style={[styles.card, { backgroundColor: notice.bg, borderColor: c.border }]}>
      <Icon size={18} color={notice.tint} />
      <Text style={[styles.message, { color: c.text }]}>{notice.message}</Text>
      {notice.action && (
        <Pressable accessibilityRole="button" onPress={notice.action.onPress} hitSlop={8}>
          <Text style={[styles.action, { color: notice.tint }]}>{notice.action.label}</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={10}>
        <X size={16} color={c.mutedText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, marginVertical: spacing.xs,
  },
  message: { flex: 1, fontFamily: type.weight.medium, fontSize: type.size.sm, lineHeight: 20 },
  action: { fontFamily: type.weight.bold, fontSize: type.size.sm },
});
