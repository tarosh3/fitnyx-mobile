import { BlurView } from 'expo-blur';
import { Activity, ArrowRight, Cpu, Gauge, Target, Zap } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Data for the 3 premium slides
const SECTIONS = [
  {
    id: 'hero',
    title: 'UNLEASH\nYOUR PEAK',
    subtitle: 'Sculpt your digital physique with the most advanced fitness platform on earth.',
    icon: Activity,
    tag: 'EVOLUTION BEGINS',
  },
  {
    id: 'features',
    title: 'BEYOND\nLIMITS',
    subtitle: 'Real-time kinetic tracking, custom macro splits, and deep AI-driven analysis.',
    features: [
      { icon: Cpu, label: 'AI ANALYSIS', value: '1.2M+' },
      { icon: Target, label: 'CUSTOM PLANS', value: '450+' },
      { icon: Gauge, label: 'PRECISION', value: '99.9%' },
    ],
    tag: 'CORE SPEC',
  },
  {
    id: 'alpha',
    title: 'ALPHA\nACCESS',
    subtitle: 'Join the highest tier of elite athletes. Begin your total transformation today.',
    icon: Zap,
    tag: 'JOIN THE ELITE',
    action: true,
  },
];

export function MobileOnboarding() {
  const palette = useThemeColors();
  const { openAuth } = useAuth();
  const scrollX = useSharedValue(0);
  const neonLime = '#80f20d';

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Animated Pagination Indicator Component
  const PaginationDot = ({ index }: { index: number }) => {
    const rStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ];

      const dotWidth = interpolate(
        scrollX.value,
        inputRange,
        [8, 32, 8],
        Extrapolation.CLAMP
      );

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.3, 1, 0.3],
        Extrapolation.CLAMP
      );

      const backgroundColor = interpolateColor(
        scrollX.value,
        inputRange,
        ['rgba(255,255,255,0.2)', neonLime, 'rgba(255,255,255,0.2)']
      );

      return {
        width: dotWidth,
        opacity,
        backgroundColor,
      };
    });

    return <Animated.View style={[styles.dot, rStyle]} />;
  };

  // Render individual slide with Parallax effects
  const RenderSlide = ({ item, index }: { item: typeof SECTIONS[0]; index: number }) => {
    const rStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ];

      const translateX = interpolate(
        scrollX.value,
        inputRange,
        [SCREEN_WIDTH * 0.3, 0, -SCREEN_WIDTH * 0.3],
        Extrapolation.CLAMP
      );

      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.9, 1, 0.9],
        Extrapolation.CLAMP
      );

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0, 1, 0],
        Extrapolation.CLAMP
      );

      return {
        opacity,
        transform: [{ translateX }, { scale }],
      };
    });

    // Sub-animation for floating icons/data
    const rImageStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ];

      const translateY = interpolate(
        scrollX.value,
        inputRange,
        [100, 0, 100],
        Extrapolation.CLAMP
      );

      return {
        transform: [{ translateY }],
      };
    });

    return (
      <View style={[styles.page, { width: SCREEN_WIDTH }]}>
        <Animated.View style={[styles.content, rStyle]}>
          <Text style={[styles.tag, { color: neonLime }]}>{item.tag}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>

          <Animated.View style={[{ flex: 1, marginTop: 40 }, rImageStyle]}>
            {item.features ? (
              <View style={styles.featuresGrid}>
                {item.features.map((f, i) => (
                  <BlurView
                    key={i}
                    intensity={15}
                    tint="dark"
                    style={[styles.featureCard, i === 2 && styles.featureCardFull]}
                  >
                    <View style={styles.featureIconWrap}>
                      <f.icon color={neonLime} size={28} strokeWidth={2} />
                    </View>
                    <Text style={styles.featureValue}>{f.value}</Text>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                  </BlurView>
                ))}
              </View>
            ) : (
              <View style={styles.iconContainer}>
                {/* Simulated glowing 3D depth */}
                <View style={[styles.iconGlowLayer, { backgroundColor: neonLime, opacity: 0.15, transform: [{ scale: 1.2 }] }]} />
                <View style={[styles.iconGlowLayer, { backgroundColor: neonLime, opacity: 0.3 }]} />
                <View style={[styles.iconCoreWrap, { borderColor: neonLime }]}>
                  <item.icon color={neonLime} size={84} strokeWidth={2} />
                </View>
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {item.action && (
          <Animated.View style={[styles.buttonContainer, rStyle]}>
            <Pressable
              onPress={() => openAuth('signup')}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: neonLime, transform: [{ scale: pressed ? 0.97 : 1 }] }
              ]}
            >
              <Text style={styles.ctaText}>INITIALIZE</Text>
              <ArrowRight color="#000000" size={24} strokeWidth={3} />
            </Pressable>
            <View style={styles.loginHintRow}>
              <Text style={styles.loginHintBase}>Existing Elite?</Text>
              <Pressable hitSlop={10} onPress={() => openAuth('login')}>
                <Text style={[styles.loginHintLink, { color: neonLime }]}> SIGN IN</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Absolute Pitch Black Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />

      <Animated.ScrollView
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {SECTIONS.map((section, index) => (
          <RenderSlide key={section.id} item={section} index={index} />
        ))}
      </Animated.ScrollView>

      {/* Pagination Container */}
      <View style={styles.pagination}>
        {SECTIONS.map((_, index) => (
          <PaginationDot key={index} index={index} />
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },
  content: {
    flex: 1,
  },
  tag: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 52,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 20,
    lineHeight: 24,
    maxWidth: '90%',
  },
  // Feature Cards styling
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 48 - 12) / 2, // 2 columns minus gap
    height: 160,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureCardFull: {
    width: '100%',
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(128, 242, 13, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  featureLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },
  // Hero Icon Styling
  iconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -80,
  },
  iconGlowLayer: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    filter: [{ blur: 40 }], // pseudo-blur for depth
  },
  iconCoreWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bottom CTA Area
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 32,
    gap: 12,
    shadowColor: '#80f20d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
  },
  loginHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginHintBase: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  loginHintLink: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Pagination Dots
  pagination: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 4,
    borderRadius: 4,
  },
});

