import { useLocalSearchParams, useRouter } from 'expo-router';
import { Flame, History, Play, Search } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomNavClearance } from '@/src/components/navigation/bottomNavLayout';
import { HistoryTab } from '@/src/features/workouts/history/HistoryTab';
import { LibraryTab } from '@/src/features/workouts/library/LibraryTab';
import { TrainTab } from '@/src/features/workouts/train/TrainTab';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useRetentionMetrics } from '@/src/hooks/useRetentionMetrics';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { useWorkoutOverlayInset } from '@/src/providers/WorkoutOverlayProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

type Tab = 'train' | 'history' | 'exercises';
const TABS: { key: Tab; label: string; Icon: typeof Play }[] = [
  { key: 'train', label: 'Train', Icon: Play },
  { key: 'history', label: 'History', Icon: History },
  { key: 'exercises', label: 'Exercises', Icon: Search },
];

function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** The Workouts tab: everything to train, look back and learn, in one place. */
export default function WorkoutsScreen() {
  const c = useThemeColors();
  const workoutInset = useWorkoutOverlayInset();
  const { width, fontScale } = useWindowDimensions();
  const compactTabs = width < 360 || fontScale > 1.2;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, userProfile } = useAuth();
  const metrics = useRetentionMetrics(user?.id ?? '');
  const initial = (['train', 'history', 'exercises'] as Tab[]).includes(params.tab as Tab) ? (params.tab as Tab) : 'train';
  const [tab, setTab] = useState<Tab>(initial);
  const [segWidth, setSegWidth] = useState(0);
  const slide = useRef(new Animated.Value(TABS.findIndex((t) => t.key === initial))).current;

  useEffect(() => {
    if (params.tab && params.tab !== tab && (['train', 'history', 'exercises'] as Tab[]).includes(params.tab as Tab)) setTab(params.tab as Tab);
  }, [params.tab]);

  useEffect(() => {
    Animated.spring(slide, { toValue: TABS.findIndex((t) => t.key === tab), useNativeDriver: true, speed: 18, bounciness: 4 }).start();
  }, [tab, slide]);

  const select = (next: Tab) => {
    setTab(next);
    router.setParams({ tab: next });
  };

  const firstName = userProfile?.first_name || user?.user_metadata?.first_name || '';
  const thumbW = segWidth ? (segWidth - 8 - 8) / 3 : 0;

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={[styles.grow, fontScale > 1.2 && styles.largeTitle]}>
          <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">Workouts</Text>
          <Text style={[styles.sub, { color: c.mutedText }]}>{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
        </View>
        {metrics.streakDays > 0 ? (
          <Pressable onPress={() => toast('Work out at least every 2 days to keep your streak going.')} accessibilityRole="button"
            accessibilityLabel={`${metrics.streakDays} day streak. What does this mean?`}
            style={[styles.streak, { backgroundColor: c.parts.arms.bg }]}>
            <Flame size={18} color={c.parts.arms.fg} fill={c.parts.arms.fg} />
            <Text style={[styles.streakText, { color: c.parts.arms.fg }]}><Text style={styles.streakNum}>{metrics.streakDays}-day</Text> streak</Text>
          </Pressable>
        ) : null}
      </View>
      <View accessibilityRole="tablist" onLayout={(e: LayoutChangeEvent) => setSegWidth(e.nativeEvent.layout.width)}
        style={[styles.seg, { backgroundColor: c.surface, borderColor: c.border }]}>
        {thumbW > 0 ? (
          <Animated.View style={[styles.thumb, { width: thumbW, backgroundColor: c.accentSoft, borderColor: c.accentSoft,
            transform: [{ translateX: Animated.multiply(slide, thumbW + 4) }] }]} />
        ) : null}
        {TABS.map(({ key, label, Icon }) => {
          const on = tab === key;
          return (
            <Pressable key={key} testID={`seg-${key}`} onPress={() => select(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={styles.segBtn}>
              {!compactTabs ? <Icon size={18} color={on ? c.accent : c.mutedText} /> : null}
              <Text style={[styles.segText, { color: on ? c.accent : c.mutedText }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const pad = { paddingTop: insets.top + spacing.base, paddingHorizontal: spacing.lg };
  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      {tab === 'train' ? (
        <ScrollView style={styles.fill} contentContainerStyle={[pad, { paddingBottom: bottomNavClearance(insets.bottom) + spacing['2xl'] + workoutInset }]} showsVerticalScrollIndicator={false}>
          {header}
          {user ? <TrainTab userId={user.id} onSeeHistory={() => select('history')} /> : null}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad]}>
          {tab === 'history' ? <HistoryTab header={header} /> : <LibraryTab header={header} />}
        </View>
      )}
      <View pointerEvents="none" style={[styles.safeFloor, { height: insets.bottom, backgroundColor: c.background }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safeFloor: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  grow: { flex: 1, minWidth: 170 },
  largeTitle: { flexBasis: '100%' },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  title: { fontFamily: type.weight.extrabold, fontSize: 34, letterSpacing: -1 },
  sub: { fontFamily: type.weight.regular, fontSize: 15 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, paddingHorizontal: 12, minHeight: 40, marginTop: 6 },
  streakText: { fontFamily: type.weight.semibold, fontSize: 14 },
  streakNum: { fontFamily: type.weight.extrabold },
  seg: { flexDirection: 'row', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 4, marginTop: spacing.base, gap: 4 },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  segBtn: { flex: 1, minHeight: 48, paddingHorizontal: 4, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segText: { flexShrink: 1, textAlign: 'center', fontFamily: type.weight.semibold, fontSize: 15 },
});
