import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { DietPlanView } from '@/src/features/diet/DietPlanView';
import { DietWizard } from '@/src/features/diet/DietWizard';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { DietPlan, generateDietPlan, getDietPlan } from '@/src/lib/api';

const FITNESS_TIPS = [
  'Muscle burns more calories at rest than fat.',
  'Protein after workouts supports recovery and growth.',
  'Sleep quality strongly affects muscle repair.',
  'Hydration can directly improve workout performance.',
  'Consistency over intensity wins long-term progress.',
];

const NEON_LIME = '#5fc793';

export default function DietScreen() {
  const palette = useThemeColors();
  const router = useRouter();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<'wizard' | 'plan'>('wizard');
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    loadPlan();
  }, []);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % FITNESS_TIPS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [generating]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const result = await getDietPlan();
      if (result?.id) {
        setPlan(result);
        setView('plan');
      } else {
        setView('wizard');
      }
    } catch {
      setView('wizard');
    } finally {
      // Small delay for smooth transition
      setTimeout(() => setLoading(false), 800);
    }
  };

  const onGenerate = async (preferences: any) => {
    setGenerating(true);
    try {
      const result = await generateDietPlan(preferences);
      setPlan(result);
      setView('plan');
    } catch (error) {
      console.error('Failed to generate diet plan', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={NEON_LIME} />
          <Text style={styles.loaderText}>Syncing nutrition...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <ChevronLeft color={palette.text} size={24} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>DIET & NUTRITION</Text>
          <Text style={styles.headerSub}>Personalized meal planning</Text>
        </View>
      </View>

      {generating ? (
        <View style={styles.generatingWrapper}>
          <BlurView intensity={20} tint="dark" style={styles.generatingCard}>
            <View style={styles.iconCircle}>
              <LottieView
                source={require('@/assets/animations/chatbot.json')}
                autoPlay
                loop
                style={{ width: 80, height: 80 }}
              />
            </View>
            <Text style={styles.generatingTitle}>CRAFTING YOUR PLAN</Text>
            <View style={styles.tipContainer}>
              <Sparkles color={NEON_LIME} size={14} />
              <Text style={styles.generatingSub}>{FITNESS_TIPS[tipIndex]}</Text>
            </View>
            <ActivityIndicator size="small" color={NEON_LIME} style={{ marginTop: 20 }} />
          </BlurView>
        </View>
      ) : view === 'wizard' ? (
        <DietWizard onComplete={onGenerate} isLoading={generating} />
      ) : plan ? (
        <DietPlanView
          plan={plan}
          onRegenerate={() => onGenerate(plan.preferences)}
          onEditPreferences={() => setView('wizard')}
          isLoading={generating}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={{ color: palette.mutedText, fontSize: 13 }}>No diet plan available.</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </Screen>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  container: {
    backgroundColor: palette.background,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: palette.mutedText,
    fontSize: 13,
    fontWeight: '500',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  generatingWrapper: {
    flex: 1,
    paddingTop: 40,
  },
  generatingCard: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 32,
    alignItems: 'center',
    backgroundColor: palette.card,
    overflow: 'hidden',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(128, 242, 13, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.1)',
  },
  generatingTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 16,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  generatingSub: {
    color: palette.mutedText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
});
