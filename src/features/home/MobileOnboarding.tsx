import { BlurView } from 'expo-blur';
import { Activity, ArrowRight, Cpu, Gauge, Target, Zap } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  FadeInUp,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const neonLime = '#5fc793';

const SECTIONS = [
  {
    id: 'hero',
    title: 'WELCOME TO\nFITNYX',
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
    title: 'FITNYX\nELITE',
    subtitle: 'Join the highest tier of elite athletes. Begin your total transformation today.',
    icon: Zap,
    tag: 'ALPHA ACCESS',
    action: true,
  },
];

export function MobileOnboarding() {
  const { openAuth } = useAuth();
  const palette = useThemeColors();
  const styles = getStyles(palette);
  const scrollX = useSharedValue(0);

  // Global continuous animations for glowing accents
  const breatheVal = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    breatheVal.value = withRepeat(
      withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withTiming(0.6, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const PaginationDot = ({ index }: { index: number }) => {
    const rStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ];

      const dotWidth = interpolate(scrollX.value, inputRange, [8, 32, 8], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
      const backgroundColor = interpolateColor(scrollX.value, inputRange, [
        palette.border,
        neonLime,
        palette.border
      ]);

      return { width: dotWidth, opacity, backgroundColor };
    });

    return <Animated.View style={[styles.dot, rStyle]} />;
  };

  const RenderSlide = ({ item, index }: { item: typeof SECTIONS[0]; index: number }) => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    // Staggered Text Animations (Parallax)
    const rTagStyle = useAnimatedStyle(() => {
      const translateX = interpolate(scrollX.value, inputRange, [SCREEN_WIDTH * 0.4, 0, -SCREEN_WIDTH * 0.4], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [-0.2, 1, -0.2], Extrapolation.CLAMP);
      return { opacity, transform: [{ translateX }] };
    });

    const rTitleStyle = useAnimatedStyle(() => {
      const translateX = interpolate(scrollX.value, inputRange, [SCREEN_WIDTH * 0.6, 0, -SCREEN_WIDTH * 0.6], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [-0.5, 1, -0.5], Extrapolation.CLAMP);
      return { opacity, transform: [{ translateX }] };
    });

    const rSubStyle = useAnimatedStyle(() => {
      const translateX = interpolate(scrollX.value, inputRange, [SCREEN_WIDTH * 0.8, 0, -SCREEN_WIDTH * 0.8], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [-0.8, 1, -0.8], Extrapolation.CLAMP);
      return { opacity, transform: [{ translateX }] };
    });

    // Main graphic element animation
    const rImageStyle = useAnimatedStyle(() => {
      const translateY = interpolate(scrollX.value, inputRange, [120, 0, 120], Extrapolation.CLAMP);
      const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP);
      const opacity = interpolate(scrollX.value, inputRange, [-0.5, 1, -0.5], Extrapolation.CLAMP);
      return { opacity, transform: [{ translateY }, { scale }] };
    });

    // Continuous breathing for glowing backgrounds
    const rGlow1 = useAnimatedStyle(() => ({
      transform: [{ scale: breatheVal.value }],
      opacity: pulseOpacity.value * 0.2,
    }));
    const rGlow2 = useAnimatedStyle(() => ({
      transform: [{ scale: breatheVal.value * 1.1 }],
      opacity: pulseOpacity.value * 0.1,
    }));

    return (
      <View style={[styles.page, { width: SCREEN_WIDTH }]}>

        {/* Abstract Glowing Background Orbs */}
        <Animated.View style={[styles.bgOrb, { top: '15%', left: -80, backgroundColor: neonLime }, rGlow1]} />
        <Animated.View style={[styles.bgOrb, { bottom: '25%', right: -100, backgroundColor: '#60A5FA' }, rGlow2]} />

        <View style={styles.content}>
          <Animated.View style={rTagStyle} entering={FadeInDown.delay(300).springify()}>
            <View style={styles.tagBadge}>
              <Text style={styles.tag}>{item.tag}</Text>
            </View>
          </Animated.View>

          <Animated.Text style={[styles.title, rTitleStyle]} entering={FadeInUp.delay(500).springify()}>{item.title}</Animated.Text>
          <Animated.Text style={[styles.subtitle, rSubStyle]} entering={FadeInUp.delay(700).springify()}>{item.subtitle}</Animated.Text>

          <Animated.View style={[styles.imageContainer, rImageStyle]}>
            {item.features ? (
              <View style={styles.featuresGrid}>
                {item.features.map((f, i) => (
                  <Animated.View entering={ZoomIn.delay(800 + i * 200).springify()} key={i} style={[styles.featureCardWrap, i === 2 && styles.featureCardFullWrap]}>
                    <BlurView intensity={20} tint="dark" style={styles.featureCard}>
                      <View style={styles.featureIconWrap}>
                        <f.icon color={neonLime} size={28} strokeWidth={2} />
                      </View>
                      <Text style={styles.featureValue}>{f.value}</Text>
                      <Text style={styles.featureLabel}>{f.label}</Text>
                    </BlurView>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <Animated.View style={[styles.iconGlowLayer, { backgroundColor: neonLime }, rGlow1]} />
                <Animated.View style={[styles.iconGlowLayer, { backgroundColor: neonLime }, rGlow2]} />
                <Animated.View entering={ZoomIn.delay(800).springify()}>
                  <BlurView intensity={40} tint="dark" style={styles.iconCoreWrap}>
                    <item.icon color={neonLime} size={64} strokeWidth={1.5} />
                  </BlurView>
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </View>

        {item.action && (
          <Animated.View style={[styles.buttonContainer, rTitleStyle]} entering={FadeInUp.delay(900).springify()}>
            <Pressable
              onPress={() => openAuth('signup')}
              style={({ pressed }) => [
                styles.ctaButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
            >
              {/* Button Glow effect */}
              <Animated.View style={[StyleSheet.absoluteFill, styles.ctaGlow, rGlow1]} />
              <View style={styles.ctaInner}>
                <Text style={styles.ctaText}>GET STARTED</Text>
                <ArrowRight color="#000000" size={24} strokeWidth={3} />
              </View>
            </Pressable>
            <View style={styles.loginHintRow}>
              <Text style={styles.loginHintBase}>Existing Elite?</Text>
              <Pressable hitSlop={15} onPress={() => openAuth('login')}>
                <Text style={styles.loginHintLink}> LOG IN</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]} />
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
      <View style={styles.pagination}>
        {SECTIONS.map((_, index) => (
          <PaginationDot key={index} index={index} />
        ))}
      </View>
    </View>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
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
    zIndex: 10,
  },
  bgOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
    filter: [{ blur: 60 }],
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(95, 199, 147, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(95, 199, 147, 0.2)',
  },
  tag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: neonLime,
  },
  title: {
    fontSize: 54,
    fontWeight: '900',
    color: palette.text,
    lineHeight: 52,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 16,
    color: palette.mutedText,
    marginTop: 20,
    lineHeight: 24,
    maxWidth: '90%',
  },
  imageContainer: {
    flex: 1,
    marginTop: 40,
    justifyContent: 'center',
  },
  // Features Grid Slide 2
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureCardWrap: {
    width: (SCREEN_WIDTH - 48 - 12) / 2,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
  },
  featureCardFullWrap: {
    width: '100%',
    height: 120,
  },
  featureCard: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    ...(StyleSheet.absoluteFillObject as any), // Fix for BlurView filling the container
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(95, 199, 147, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureValue: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  featureLabel: {
    color: palette.mutedText,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  // Hero Icons Slide 1 & 3
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlowLayer: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    filter: [{ blur: 30 }],
  },
  iconCoreWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // CTA
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 20,
    zIndex: 20,
  },
  ctaButton: {
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ctaGlow: {
    backgroundColor: neonLime,
    borderRadius: 32,
    filter: [{ blur: 15 }],
    opacity: 0.5,
  },
  ctaInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: neonLime,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  loginHintLink: {
    color: neonLime,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Pagination
  pagination: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  dot: {
    height: 4,
    borderRadius: 4,
  },
});
