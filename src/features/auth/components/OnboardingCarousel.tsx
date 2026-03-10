import { BlurView } from 'expo-blur';
import { Activity, BarChart3, Heart, LayoutGrid } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    Extrapolate,
    interpolate,
    SharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        label: 'EVOLUTION BEGINS',
        headline: 'WELCOME TO\nFITNYX',
        description: 'Train smarter with AI-powered fitness tracking.',
        icon: Activity,
        visualType: 'PULSE',
    },
    {
        id: '2',
        label: 'CORE PERFORMANCE',
        headline: '300+ WORKOUTS',
        description: 'Follow guided sessions or create custom workout plans.',
        icon: LayoutGrid,
        visualType: 'GRID',
    },
    {
        id: '3',
        label: 'AI COACH',
        headline: 'SMART TRAINING',
        description: 'AI analyzes your workouts and helps you improve faster.',
        icon: BarChart3,
        visualType: 'ANALYTICS',
    },
];

interface OnboardingCarouselProps {
    isPaused: boolean;
}

export function OnboardingCarousel({ isPaused }: OnboardingCarouselProps) {
    const scrollX = useSharedValue(0);
    const scrollRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const lastInteractionTime = useRef(Date.now());

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
        onBeginDrag: () => {
            lastInteractionTime.current = Date.now();
        },
    });

    // Auto-scroll logic
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            const timeSinceInteraction = Date.now() - lastInteractionTime.current;
            if (timeSinceInteraction < 5000) return; // Wait 5s after manual touch

            let nextIndex = (currentIndex + 1) % SLIDES.length;
            scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
            setCurrentIndex(nextIndex);
        }, 3000);

        return () => clearInterval(interval);
    }, [currentIndex, isPaused]);

    const PaginationDot = ({ index }: { index: number }) => {
        const rStyle = useAnimatedStyle(() => {
            const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
            ];
            const width = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolate.CLAMP);
            const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolate.CLAMP);
            return {
                width,
                opacity,
                backgroundColor: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolate.CLAMP) > 0.5 ? '#5FC793' : '#9CA3AF',
            };
        });
        return <Animated.View style={[styles.dot, rStyle]} />;
    };

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                ref={scrollRef as any}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(idx);
                }}
            >
                {SLIDES.map((slide, index) => (
                    <Slide key={slide.id} slide={slide} index={index} scrollX={scrollX} />
                ))}
            </Animated.ScrollView>

            <View style={styles.pagination}>
                {SLIDES.map((_, i) => (
                    <PaginationDot key={i} index={i} />
                ))}
            </View>
        </View>
    );
}

function Slide({ slide, index, scrollX }: { slide: typeof SLIDES[0], index: number, scrollX: SharedValue<number> }) {
    const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
    ];

    const rStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolate.CLAMP);
        const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolate.CLAMP);
        return { opacity, transform: [{ scale }] };
    });

    return (
        <Animated.View style={[styles.slide, rStyle]}>
            <View style={styles.slideHeader}>
                <View style={styles.labelBadge}>
                    <Text style={styles.label}>{slide.label}</Text>
                </View>
                <Text style={styles.headline}>{slide.headline}</Text>
                <Text style={styles.description}>{slide.description}</Text>
            </View>

            <View style={styles.visualContainer}>
                <Visual type={slide.visualType} />
            </View>
        </Animated.View>
    );
}

function Visual({ type }: { type: string }) {
    const breathe = useSharedValue(1);

    useEffect(() => {
        breathe.value = withRepeat(
            withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const rVisualGlow = useAnimatedStyle(() => ({
        transform: [{ scale: breathe.value }],
        opacity: interpolate(breathe.value, [1, 1.1], [0.3, 0.6]),
    }));

    if (type === 'PULSE') {
        return (
            <View style={styles.centerVisual}>
                <Animated.View style={[styles.glowOrb, rVisualGlow, { backgroundColor: '#5FC793' }]} />
                <BlurView intensity={20} tint="dark" style={styles.iconRing}>
                    <Heart color="#5FC793" size={48} strokeWidth={1.5} />
                </BlurView>
            </View>
        );
    }

    if (type === 'GRID') {
        return (
            <View style={styles.centerVisual}>
                <Animated.View style={[styles.glowOrb, rVisualGlow, { backgroundColor: '#5FC793', opacity: 0.2 }]} />
                <View style={styles.gridContainer}>
                    {[0, 1, 2, 3].map((i) => (
                        <BlurView key={i} intensity={25} tint="dark" style={styles.gridCard}>
                            <View style={styles.miniBar} />
                            <View style={[styles.miniBar, { width: '60%', marginTop: 8 }]} />
                        </BlurView>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.centerVisual}>
            <Animated.View style={[styles.glowOrb, rVisualGlow, { backgroundColor: '#5FC793' }]} />
            <BlurView intensity={20} tint="dark" style={styles.iconRing}>
                <BarChart3 color="#5FC793" size={48} strokeWidth={1.5} />
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        padding: 32,
        paddingTop: 40,
    },
    slideHeader: {
        alignItems: 'center',
        textAlign: 'center',
    },
    labelBadge: {
        backgroundColor: 'rgba(95, 199, 147, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(95, 199, 147, 0.2)',
        marginBottom: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: '#5FC793',
        letterSpacing: 2,
    },
    headline: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 44,
        letterSpacing: -1,
    },
    description: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 24,
    },
    visualContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    centerVisual: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowOrb: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        filter: [{ blur: 40 }],
    },
    iconRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        width: 160,
        justifyContent: 'center',
    },
    gridCard: {
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 10,
        overflow: 'hidden',
    },
    miniBar: {
        height: 4,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        position: 'absolute',
        bottom: 20,
        width: '100%',
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
});
