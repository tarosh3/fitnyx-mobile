import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { useOfflineAware } from '@/src/hooks/useOfflineAware';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import {
  activateWorkoutPlan,
  deleteWorkoutPlan,
  getDefaultWorkoutPlans,
  getWorkoutPlans,
  WorkoutPlan,
} from '@/src/lib/api/workoutPlans';
import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { cacheKeys, cacheTTL } from '@/src/lib/cache/keys';
import { useAuth } from '@/src/providers/AuthProvider';
import {
  ArrowRight,
  Info,
  Plus,
  ShieldCheck,
  Trash2,
  Zap
} from 'lucide-react-native';

const NEON_LIME = '#5fc793';

type PlansTab = 'my-plans' | 'system-plans';

function formatDate(dateString?: string) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SelectWorkoutScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = useMemo(() => getStyles(palette), [palette]);
  const { isOffline } = useOfflineAware();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<PlansTab>('my-plans');
  const [myPlans, setMyPlans] = useState<WorkoutPlan[]>([]);
  const [defaultPlans, setDefaultPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const hideConfirm = () => setConfirmConfig((prev) => ({ ...prev, visible: false }));

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOffline) {
        // Load from cache when offline
        const cachedPlans = user ? await idbGet<{ data: WorkoutPlan[] }>(cacheKeys.workoutPlans(user.id)) : null;
        if (cachedPlans?.data) {
          setMyPlans(cachedPlans.data);
        }
        setDefaultPlans([]);
        setLoading(false);
        return;
      }

      const [my, defaults] = await Promise.all([getWorkoutPlans(), getDefaultWorkoutPlans()]);
      setMyPlans(my.data || []);
      setDefaultPlans(defaults.data || []);

      // Cache plans for offline use
      if (user && my.data) {
        idbSet(cacheKeys.workoutPlans(user.id), { data: my.data }, cacheTTL.DAY).catch(() => {});
      }
    } catch (loadError) {
      console.error('Failed to load plans', loadError);
      // Try cache fallback on network error
      if (user) {
        const cachedPlans = await idbGet<{ data: WorkoutPlan[] }>(cacheKeys.workoutPlans(user.id));
        if (cachedPlans?.data) {
          setMyPlans(cachedPlans.data);
          setLoading(false);
          return;
        }
      }
      setError('Failed to load workout plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [isOffline]);

  const currentPlans = useMemo(() => {
    const plans = activeTab === 'my-plans' ? [...myPlans] : [...defaultPlans];
    return plans.sort((a, b) => {
      const activeA = activeTab === 'system-plans'
        ? myPlans.some((m) => m.title === a.title && m.source === 'system')
        : a.is_active;
      const activeB = activeTab === 'system-plans'
        ? myPlans.some((m) => m.title === b.title && m.source === 'system')
        : b.is_active;

      if (activeA && !activeB) return -1;
      if (!activeA && activeB) return 1;
      return 0;
    });
  }, [activeTab, defaultPlans, myPlans]);

  const isSystemPlanAdopted = (plan: WorkoutPlan) => {
    if (activeTab !== 'system-plans') return false;
    return myPlans.some((myPlan) => myPlan.title === plan.title && myPlan.source === 'system');
  };

  const isPlanActive = (plan: WorkoutPlan) => {
    if (activeTab === 'system-plans') return isSystemPlanAdopted(plan);
    return plan.is_active;
  };

  const onActivatePlan = async (planId: string) => {
    setBusyPlanId(planId);
    setError(null);
    try {
      await activateWorkoutPlan(planId);
      await loadPlans();
      if (activeTab === 'system-plans') {
        setActiveTab('my-plans');
      }
    } catch (activateError) {
      console.error('Failed to activate', activateError);
      setError('Failed to activate plan.');
    } finally {
      setBusyPlanId(null);
    }
  };

  const onDeletePlan = (planId: string) => {
    setConfirmConfig({
      visible: true,
      title: 'DELETE PLAN',
      message: 'This action cannot be undone. All data associated with this plan will be lost.',
      onConfirm: async () => {
        hideConfirm();
        setBusyPlanId(planId);
        setError(null);
        try {
          await deleteWorkoutPlan(planId);
          await loadPlans();
        } catch (deleteError) {
          console.error('Failed to delete', deleteError);
          setError('Failed to delete plan.');
        } finally {
          setBusyPlanId(null);
        }
      },
    });
  };

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      <PageHeader
        title="SELECT PLAN"
        subtitle="Choose your training path"
        backTo="/dashboard"
      />

      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrap}>
          <Pressable
            onPress={() => setActiveTab('my-plans')}
            style={[styles.tabBtn, activeTab === 'my-plans' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'my-plans' && styles.tabBtnTextActive]}>
              MY PLANS
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('system-plans')}
            style={[styles.tabBtn, activeTab === 'system-plans' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'system-plans' && styles.tabBtnTextActive]}>
              DEFAULT
            </Text>
          </Pressable>
        </View>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>OFFLINE MODE — SHOWING CACHED PLANS</Text>
        </View>
      )}

      {error ? (
        <View style={[styles.errorBox, { borderColor: '#EF444466', backgroundColor: '#EF444422' }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={NEON_LIME} />
        </View>
      ) : currentPlans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Info size={32} color={palette.mutedText} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'my-plans' ? 'No Custom Plans' : 'No Default Plans'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'my-plans'
              ? 'Craft your perfect routine to reach your peak performance.'
              : 'Our system plans are being optimized for your profile.'}
          </Text>

          {activeTab === 'my-plans' && !isOffline ? (
            <Pressable
              onPress={() => router.push('/workouts/customize')}
              style={styles.createBtn}
            >
              <Plus size={20} color="#000" />
              <Text style={styles.createBtnText}>CREATE CUSTOM PLAN</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.listContainer}>
          {currentPlans.map((plan) => {
            const active = isPlanActive(plan);
            const busy = busyPlanId === plan.id;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  active && styles.planCardActive
                ]}
              >
                <View style={styles.planCardContent}>
                  <View style={styles.planHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>{plan.title.toUpperCase()}</Text>
                      {active ? (
                        <View style={styles.activeGlowTag}>
                          <View style={styles.dot} />
                          <Text style={styles.activeTagText}>
                            {activeTab === 'system-plans' ? 'IN COLLECTION' : 'ACTIVE'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.planGoalBadge}>
                      <Text style={styles.planGoalText}>
                        {plan.goal ? plan.goal.replace('_', ' ').toUpperCase() : 'FITNESS'}
                      </Text>
                    </View>
                  </View>

                  {plan.description ? (
                    <Text style={styles.planDesc} numberOfLines={2}>
                      {plan.description}
                    </Text>
                  ) : null}

                  <View style={styles.metaStrip}>
                    <View style={styles.metaItem}>
                      <Zap size={10} color={palette.mutedText} />
                      <Text style={styles.metaText}>{plan.source.toUpperCase()}</Text>
                    </View>
                    {activeTab === 'my-plans' && (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaText}>START: {formatDate(plan.start_date).toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.planActions}>
                    {!active && !isOffline ? (
                      <Pressable
                        onPress={() => onActivatePlan(plan.id)}
                        disabled={busy}
                        style={styles.activateAction}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <ShieldCheck size={16} color="#000" />
                            <Text style={styles.activateActionText}>
                              {activeTab === 'system-plans' ? 'USE PLAN' : 'ACTIVATE'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={() => router.push(`/workouts/plans/${plan.id}`)}
                      style={[styles.detailsAction, (active || isOffline) && { flex: 1 }]}
                    >
                      <ArrowRight size={16} color={palette.text} />
                      <Text style={styles.detailsActionText}>DETAILS</Text>
                    </Pressable>

                    {activeTab === 'my-plans' && !isOffline && (
                      <Pressable
                        onPress={() => onDeletePlan(plan.id)}
                        style={styles.deleteAction}
                      >
                        <Trash2 size={16} color={palette.mutedText} />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <ConfirmModal
        visible={confirmConfig.visible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={hideConfirm}
        variant="danger"
        confirmLabel="DELETE"
      />
    </Screen>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  tabsContainer: {
    marginBottom: 24,
  },
  tabsWrap: {
    backgroundColor: palette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    padding: 6,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: NEON_LIME,
  },
  tabBtnText: {
    color: palette.mutedText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tabBtnTextActive: {
    color: '#000',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
  },
  emptySubtitle: {
    color: palette.mutedText,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  createBtn: {
    backgroundColor: NEON_LIME,
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  createBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  listContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  planCard: {
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  planCardActive: {
    borderColor: 'rgba(128, 242, 13, 0.4)',
    backgroundColor: 'rgba(128, 242, 13, 0.04)',
  },
  planCardContent: {
    padding: 20,
    gap: 16,
  },
  planHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  planTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  activeGlowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NEON_LIME,
    shadowColor: NEON_LIME,
    shadowRadius: 4,
    shadowOpacity: 1,
  },
  activeTagText: {
    color: NEON_LIME,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  planGoalBadge: {
    backgroundColor: palette.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  planGoalText: {
    color: palette.mutedText,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planDesc: {
    color: palette.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  metaStrip: {
    flexDirection: 'row',
    gap: 16,
    opacity: 0.6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: palette.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  activateAction: {
    flex: 1.2,
    backgroundColor: NEON_LIME,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activateActionText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  detailsAction: {
    flex: 1,
    backgroundColor: palette.card,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  detailsActionText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  deleteAction: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
