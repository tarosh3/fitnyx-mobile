import {
  Clock,
  Dumbbell,
  Play,
  Search,
  Settings,
  SlidersHorizontal
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { WeeklyCalendar } from '@/src/components/dashboard/WeeklyCalendar';
import { Card } from '@/src/components/ui/Card';
import { Screen } from '@/src/components/ui/Screen';
import { ExerciseDetailModal } from '@/src/features/dashboard/ExerciseDetailModal';
import { ExerciseMedia } from '@/src/features/workouts/ExerciseMedia';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchExerciseByUUID, fetchExercises } from '@/src/lib/api/exercises';
import { useAuth } from '@/src/providers/AuthProvider';
import type { Exercise, RelatedExercise } from '@/src/types/exercise';
import { useRouter } from 'expo-router';

const MUSCLES = ['Abs', 'Biceps', 'Triceps', 'Chest', 'Back', 'Legs', 'Shoulders', 'Glutes', 'Calves', 'Cardio'];

const NEON_LIME = '#80f20d';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

function getThumbnail(exercise: Exercise): string | undefined {
  return (
    exercise.variations?.[0]?.image ||
    exercise.primary_muscles?.[0]?.image ||
    exercise.alternatives?.[0]?.image ||
    exercise.media_url ||
    undefined
  );
}

export default function ExercisesScreen() {
  const palette = useThemeColors();
  const { user, avatarUrl } = useAuth();
  const router = useRouter();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [muscle, setMuscle] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPage = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (!user) return;

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetchExercises({
          page: targetPage,
          limit: 20,
          search: debouncedSearch,
          muscle,
          is_warmup: isWarmup,
        });

        const next = response.data || [];
        setExercises((prev) => (reset ? next : [...prev, ...next]));
        setHasMore(response.meta.current_page < response.meta.total_pages);
        setPage(targetPage + 1);
      } catch (error) {
        console.error('Failed to load exercises', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, isWarmup, muscle, user]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadPage(1, true);
  }, [loadPage]);

  const openExercise = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setInfoOpen(true);
  };

  const onSelectRelated = async (exercise: RelatedExercise) => {
    try {
      const detailed = await fetchExerciseByUUID(exercise.uuid);
      setSelectedExercise(detailed);
    } catch {
      // Keep current exercise details if fetch fails.
    }
  };

  const renderItem = ({ item, index }: { item: Exercise; index: number }) => {
    const thumbnail = getThumbnail(item);
    const defaultBgs = ['#1E1E1E', '#2D2D2D', '#333333'];
    const fallbackBg = defaultBgs[index % 3];

    return (
      <Pressable
        onPress={() => openExercise(item)}
        style={({ pressed }) => [styles.tileWrap, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <Card style={styles.tile}>
          <View style={styles.tileContentRow}>
            <View style={[styles.tileImgWrap, { backgroundColor: fallbackBg }]}>
              {thumbnail ? (
                <ExerciseMedia url={thumbnail} title={item.title} style={styles.image} />
              ) : null}
            </View>
            <View style={styles.tileTextCol}>
              <Text numberOfLines={1} style={styles.tileTitle}>
                {item.title.toUpperCase()}
              </Text>
              <View style={styles.tileMetaRow}>
                <View style={styles.tileMetaItem}>
                  <Clock color={NEON_LIME} size={12} />
                  <Text style={styles.tileMetaText}>12 MIN</Text>
                </View>
                <View style={styles.tileMetaItem}>
                  <Dumbbell color={NEON_LIME} size={12} />
                  <Text style={styles.tileMetaText}>3 X 12</Text>
                </View>
              </View>
            </View>
            <View style={styles.tilePlayWrap}>
              <Play color={NEON_LIME} size={16} fill={NEON_LIME} style={{ marginLeft: 2 }} />
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  const EmptyState = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <SlidersHorizontal color="#64748B" size={34} />
        <Text style={styles.emptyTitle}>No exercises found</Text>
        <Text style={styles.emptySub}>Try adjusting search or filters.</Text>
        <Pressable
          onPress={() => {
            setSearch('');
            setMuscle('');
            setIsWarmup(false);
          }}
          style={styles.clearFilterBtn}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Clear Filters</Text>
        </Pressable>
      </View>
    ),
    []
  );

  const userName =
    user?.user_metadata?.username ||
    user?.user_metadata?.first_name ||
    user?.email?.split('@')[0] ||
    'Guest';

  const todayDateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const headerElement = (
    <View style={styles.headerContainer}>
      <View style={styles.userHeaderRow}>
        <View style={styles.userInfoLeft}>
          <View style={styles.avatarWrap}>
            {avatarUrl || user?.user_metadata?.avatar_url ? (
              <Image source={{ uri: avatarUrl || user?.user_metadata?.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.greetingTitle}>HELLO, {userName.toUpperCase()}</Text>
            <Text style={styles.greetingSub}>{todayDateStr.toUpperCase()}</Text>
          </View>
        </View>
        <Pressable style={styles.mascotBtn}>
          <Settings color="#fff" size={24} />
        </Pressable>
      </View>

      <View style={styles.challengeCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.challengeTitle}>DAILY{"\n"}CHALLENGE</Text>
          <Text style={styles.challengeSub}>Push your limits today</Text>
          <Pressable
            onPress={() => router.push('/workouts/select')}
            style={({ pressed }) => [styles.challengeBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.challengeBtnText}>JOIN NOW</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <WeeklyCalendar />
      </View>

      <View style={styles.sectionHeadRow}>
        <Text style={styles.sectionTitle}>DAILY PROGRAM</Text>
        <Pressable onPress={() => {
          setSearch('');
          setMuscle('');
          setIsWarmup(false);
        }}>
          <Text style={styles.seeAllText}>SEE ALL</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Search color="rgba(255,255,255,0.3)" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH EXERCISES..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
          <Pressable
            onPress={() => setMuscle('')}
            style={[styles.chip, muscle === '' && styles.chipActive]}
          >
            <Text style={[styles.chipText, muscle === '' && styles.chipTextActive]}>ALL</Text>
          </Pressable>
          {MUSCLES.map((item) => {
            const active = muscle === item;
            return (
              <Pressable
                key={item}
                onPress={() => setMuscle(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.warmupRow}>
        <Text style={styles.warmupLabel}>WARMUP EXERCISES ONLY</Text>
        <Pressable onPress={() => setIsWarmup((prev) => !prev)} style={styles.switchWrap}>
          <View style={[styles.switchTrack, isWarmup && styles.switchTrackActive]}>
            <View style={[styles.switchThumb, { transform: [{ translateX: isWarmup ? 20 : 0 }] }]} />
          </View>
        </Pressable>
      </View>

      {loading && exercises.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={NEON_LIME} />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false} contentContainerStyle={{ paddingHorizontal: 0, backgroundColor: DEPTH_BG }}>
      <FlatList
        data={exercises}
        keyExtractor={(item) => `${item.id}-${item.uuid}`}
        numColumns={1}
        renderItem={renderItem}
        ListHeaderComponent={headerElement}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? EmptyState : null}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (loadingMore || !hasMore || loading) return;
          loadPage(page, false);
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator color={NEON_LIME} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      <ExerciseDetailModal
        exercise={selectedExercise}
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        onSelectExercise={onSelectRelated}
      />

      {/* Bottom Nav Height Spacer done by listContent bottom padding */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 16,
  },
  userHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  userInfoLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  avatarWrap: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(108,242,13,0.3)',
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  greetingTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  greetingSub: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  mascotBtn: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  challengeCard: {
    backgroundColor: NEON_LIME,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    minHeight: 160,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  challengeTitle: {
    color: DEPTH_BG,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 28,
    letterSpacing: -1,
  },
  challengeSub: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  challengeBtn: {
    backgroundColor: DEPTH_BG,
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 16,
  },
  challengeBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  sectionHeadRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  seeAllText: {
    color: NEON_LIME,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchWrap: {
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    height: 52,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: 48,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterRow: {
    marginBottom: 24,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  chipActive: {
    backgroundColor: NEON_LIME,
    borderColor: NEON_LIME,
  },
  chipText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: DEPTH_BG,
  },
  warmupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  warmupLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchWrap: {
    padding: 4,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 2,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  switchTrackActive: {
    backgroundColor: NEON_LIME,
    borderColor: NEON_LIME,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  listContent: {
    paddingBottom: 100,
  },
  tileWrap: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  tile: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: BORDER_COLOR,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  tileContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tileImgWrap: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tileTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  tileTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileMetaText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tilePlayWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 14,
  },
  clearFilterBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 16,
  },
  loaderWrap: {
    padding: 40,
    alignItems: 'center',
  },
});
