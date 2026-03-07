import { BlurView } from 'expo-blur';
import { Activity, ArrowRight, Cpu, Gauge, Target, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function MobileOnboarding() {
  const palette = useThemeColors();
  const { openAuth } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);

  // Using Neon Lime as the primary highlight color for this redesign
  const neonLime = '#80f20d';

  const sections = [
    {
      id: 'hero',
      title: 'UNSTOPPABLE',
      subtitle: 'Sculpt your digital physique with the most advanced fitness platform.',
      icon: Activity,
      tag: 'EVOLUTION BEGINS',
    },
    {
      id: 'features',
      title: 'BEYOND LIMITS',
      subtitle: 'Real-time tracking, custom workouts, and AI-driven analysis.',
      features: [
        { icon: Cpu, label: 'AI ANALYSIS' },
        { icon: Target, label: 'CUSTOM PLANS' },
        { icon: Gauge, label: 'PRECISION' },
      ],
      tag: 'CORE SPEC',
    },
    {
      id: 'alpha',
      title: 'ALPHA ACCESS',
      subtitle: 'Limited-time free access. Join the elite fitness revolution.',
      icon: Zap,
      tag: 'JOIN THE ELITE',
      action: true,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Background stays dark charcoal */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0A0A' }]} />

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(index);
        }}
      >
        {sections.map((section, index) => (
          <View key={section.id} style={styles.page}>
            <View style={styles.content}>
              <Text style={[styles.tag, { color: neonLime }]}>{section.tag}</Text>
              <Text style={styles.title}>{section.title}</Text>
              <Text style={styles.subtitle}>{section.subtitle}</Text>

              {section.features ? (
                <View style={styles.featuresGrid}>
                  {section.features.map((f, i) => (
                    <BlurView key={i} intensity={10} tint="light" style={styles.featureCard}>
                      <f.icon color={neonLime} size={32} strokeWidth={1.5} />
                      <Text style={styles.featureLabel}>{f.label}</Text>
                    </BlurView>
                  ))}
                </View>
              ) : (
                <View style={styles.iconContainer}>
                  <View style={[styles.iconGlow, { backgroundColor: neonLime, opacity: 0.15 }]} />
                  <section.icon color={neonLime} size={120} strokeWidth={1} />
                </View>
              )}
            </View>

            {index === sections.length - 1 && (
              <View style={styles.buttonContainer}>
                <Pressable
                  onPress={() => openAuth('signup')}
                  style={({ pressed }) => [
                    styles.ctaButton,
                    { backgroundColor: neonLime, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <Text style={styles.ctaText}>Get Started</Text>
                  <ArrowRight color="#000" size={20} strokeWidth={3} />
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Pagination indicators */}
      <View style={styles.pagination}>
        {sections.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: activeIndex === index ? 32 : 8,
                backgroundColor: activeIndex === index ? neonLime : 'rgba(255,255,255,0.2)',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH - 64, // Subtracting horizontal padding from Screen (32 * 2)
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  tag: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 58,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    lineHeight: 26,
    maxWidth: '90%',
  },
  iconContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 40,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 64 - 12) / 2,
    height: 120,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: 1,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 32,
    gap: 12,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pagination: {
    position: 'absolute',
    bottom: 50,
    left: 32,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
});
