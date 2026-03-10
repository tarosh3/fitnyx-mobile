import { useThemeColors } from '@/src/hooks/useThemeColors';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    BackHandler,
    Dimensions,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';
import { AuthForm } from './AuthForm';
import { OnboardingCarousel } from './components/OnboardingCarousel';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const TOP_SECTION_HEIGHT = SCREEN_HEIGHT * 0.52;
const BOTTOM_SECTION_HEIGHT = SCREEN_HEIGHT * 0.48;
const EXPANDED_PANEL_HEIGHT = SCREEN_HEIGHT * 0.8;
const COMPACT_HEADER_HEIGHT = SCREEN_HEIGHT * 0.2;

function TopographicBackground() {
    return (
        <View style={StyleSheet.absoluteFill}>
            <Svg viewBox="0 0 400 800" width="100%" height="100%" style={{ opacity: 0.15 }}>
                <G fill="none" stroke="#5FC793" strokeWidth="1.5">
                    <Path d="M -50 100 C 150 150, 250 50, 450 100" />
                    <Path d="M -50 150 C 150 200, 250 100, 450 150" />
                    <Path d="M -50 200 C 150 250, 250 150, 450 200" />
                    <Path d="M -50 250 C 150 300, 250 200, 450 250" />
                    <Path d="M -50 300 C 150 350, 250 350, 450 300" />
                    <Path d="M -50 350 C 150 400, 250 300, 450 350" />

                    <Path d="M 200 500 C 150 450, 50 550, 150 650 C 250 750, 300 600, 200 500" />
                    <Path d="M 220 480 C 130 400, 10 550, 120 680 C 280 800, 350 620, 220 480" />
                    <Path d="M 240 460 C 110 350, -30 550, 90 710 C 310 850, 400 640, 240 460" />
                    <Path d="M 260 440 C 90 300, -70 550, 60 840 C 340 900, 450 660, 260 440" />
                </G>
            </Svg>
        </View>
    );
}

type AuthState = 'IDLE' | 'SIGN_UP' | 'LOG_IN';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function AuthLanding() {
    const [authState, setAuthState] = useState<AuthState>('IDLE');
    const insets = useSafeAreaInsets();
    const palette = useThemeColors();

    // Animation shared values
    const expandProgress = useSharedValue(0); // 0 = Idle, 1 = Expanded
    const formOpacity = useSharedValue(0);
    const modeProgress = useSharedValue(0); // 0 = LOGIN, 1 = SIGNUP

    const handleExpand = useCallback((targetState: AuthState) => {
        setAuthState(targetState);
        modeProgress.value = targetState === 'SIGN_UP' ? 1 : 0;
        expandProgress.value = withSpring(1, { damping: 15, stiffness: 90 });
        formOpacity.value = withTiming(1, { duration: 400 });
    }, []);

    const handleCollapse = useCallback(() => {
        expandProgress.value = withSpring(0, { damping: 15, stiffness: 90 });
        formOpacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => setAuthState('IDLE'), 300);
    }, []);

    useEffect(() => {
        const onBackPress = () => {
            if (authState !== 'IDLE') {
                handleCollapse();
                return true;
            }
            return false;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [authState, handleCollapse]);

    // Animated styles
    const rTopSectionStyle = useAnimatedStyle(() => {
        const height = interpolate(
            expandProgress.value,
            [0, 1],
            [TOP_SECTION_HEIGHT, COMPACT_HEADER_HEIGHT],
            Extrapolate.CLAMP
        );
        return { height };
    });

    const rPanelStyle = useAnimatedStyle(() => {
        const expandedHeight = interpolate(modeProgress.value, [0, 1], [EXPANDED_PANEL_HEIGHT, EXPANDED_PANEL_HEIGHT]);
        const height = interpolate(
            expandProgress.value,
            [0, 1],
            [BOTTOM_SECTION_HEIGHT, expandedHeight],
            Extrapolate.CLAMP
        );

        return { height };
    });

    const rCarouselOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0, 0.5], [1, 0], Extrapolate.CLAMP),
    }));

    const rCompactHeaderOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(expandProgress.value, [0.5, 1], [0, 1], Extrapolate.CLAMP),
    }));

    const rFormStyle = useAnimatedStyle(() => ({
        opacity: formOpacity.value,
        transform: [{ translateY: interpolate(formOpacity.value, [0, 1], [20, 0]) }],
    }));

    const animatedPathProps = useAnimatedProps(() => {
        const p = expandProgress.value;
        const mp = modeProgress.value;

        const targetY1 = interpolate(mp, [0, 1], [100, 80]);
        const targetC1y = interpolate(mp, [0, 1], [40, 20]);
        const targetC2y = interpolate(mp, [0, 1], [65, 50]);
        const targetPy1 = interpolate(mp, [0, 1], [100, 80]);
        const targetC3y = interpolate(mp, [0, 1], [140, 120]);
        const targetC4y = interpolate(mp, [0, 1], [150, 130]);
        const targetPy2 = interpolate(mp, [0, 1], [120, 100]);

        const y1 = interpolate(p, [0, 1], [170, targetY1]);
        const c1y = interpolate(p, [0, 1], [90, targetC1y]);
        const c2y = interpolate(p, [0, 1], [100, targetC2y]);
        const py1 = interpolate(p, [0, 1], [170, targetPy1]);
        const c3y = interpolate(p, [0, 1], [240, targetC3y]);
        const c4y = interpolate(p, [0, 1], [250, targetC4y]);
        const py2 = interpolate(p, [0, 1], [200, targetPy2]);

        return {
            d: `M 0,${y1} C 280,${c1y} 500,${c2y} 720,${py1} C 940,${c3y} 1200,${c4y} 1440,${py2} L 1440,300 L 0,300 Z`
        };
    });

    return (
        <View style={[styles.container, { backgroundColor: '#000000' }]}>
            <StatusBar barStyle="light-content" />

            {/* Top Section: Carousel/Branding */}
            <Animated.View style={[styles.topSection, rTopSectionStyle]}>
                <TopographicBackground />
                {/* Onboarding Carousel (Visible when IDLE) */}
                <Animated.View style={[StyleSheet.absoluteFill, rCarouselOpacity]}>
                    <OnboardingCarousel isPaused={authState !== 'IDLE'} />
                </Animated.View>

                {/* Compact Header (Visible when AUTH) */}
                <Animated.View style={[styles.compactHeader, rCompactHeaderOpacity, { paddingTop: insets.top + 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.compactBranding}>FIT</Text>
                        <Text style={[styles.compactBranding, { color: '#5FC793' }]}>NYX</Text>
                    </View>
                </Animated.View>
            </Animated.View>

            {/* Bottom Section: Panel */}
            <Animated.View style={[styles.panelContainer, rPanelStyle]}>

                <View style={[StyleSheet.absoluteFill, { overflow: 'visible', top: -60 }]}>
                    <View style={{ width: '100%', height: 300 }}>
                        <Svg viewBox="0 0 1440 300" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                            {/* Stacked strokes mimicking neon glow for Android cross-compatibility */}
                            <AnimatedPath fill="none" stroke="#5FC793" strokeWidth={15} opacity={0.2} animatedProps={animatedPathProps} />
                            <AnimatedPath fill="none" stroke="#5FC793" strokeWidth={10} opacity={0.4} animatedProps={animatedPathProps} />
                            <AnimatedPath fill="none" stroke="#5FC793" strokeWidth={5} opacity={0.8} animatedProps={animatedPathProps} />

                            {/* Main Background Panel curve */}
                            <AnimatedPath fill="#111111" animatedProps={animatedPathProps} />
                        </Svg>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#111111', marginTop: -2 }} />
                </View>

                <View style={[styles.panelContentWrapper, { paddingBottom: insets.bottom + 8 }]}>

                    {authState === 'IDLE' ? (
                        <View style={styles.idleContent}>
                            <Text style={styles.idleHeadline}>Start Your{"\n"}Fitness Evolution</Text>
                            <Text style={styles.idleDescription}>
                                Get premium guided workouts and AI-driven insights to achieve your goals faster.
                            </Text>

                            <Pressable
                                onPress={() => handleExpand('SIGN_UP')}
                                style={({ pressed }) => [
                                    styles.primaryPillBtn,
                                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                                ]}
                            >
                                <Text style={styles.primaryPillText}>GET STARTED</Text>
                                <ArrowRight color="#000000" size={20} strokeWidth={3} />
                            </Pressable>

                            <View style={styles.secondaryActionRow}>
                                <Text style={styles.secondaryText}>Already have an account?</Text>
                                <Pressable onPress={() => handleExpand('LOG_IN')} hitSlop={15}>
                                    <Text style={styles.loginLink}> Log in</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <Animated.View style={[styles.authContent, rFormStyle]}>
                            <View style={styles.panelHeaderRow}>
                                <Pressable onPress={handleCollapse} style={styles.backButton} hitSlop={15}>
                                    <ChevronLeft color="#FFFFFF" size={28} />
                                </Pressable>
                                <Text style={styles.panelTitle}>
                                    {authState === 'SIGN_UP' ? 'Create your FitNyx account' : 'Login to continue your progress'}
                                </Text>
                            </View>
                            <AuthForm
                                initialMode={authState === 'SIGN_UP' ? 'signup' : 'login'}
                                onSwitchMode={(mode) => {
                                    setAuthState(mode === 'signup' ? 'SIGN_UP' : 'LOG_IN');
                                    modeProgress.value = withSpring(mode === 'signup' ? 1 : 0, { damping: 14, stiffness: 80 });
                                }}
                            />
                        </Animated.View>
                    )}
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topSection: {
        width: '100%',
        overflow: 'hidden',
        zIndex: 1,
    },
    compactHeader: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactBranding: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 4,
    },
    panelContainer: {
        width: '100%',
        position: 'absolute',
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 20,
    },
    panelContentWrapper: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 90,
        zIndex: 10,
    },
    idleContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 8,
        marginTop: 10,
    },
    idleHeadline: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    idleDescription: {
        fontSize: 16,
        color: '#9CA3AF',
        marginBottom: 24,
        lineHeight: 24,
    },
    secondaryActionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    secondaryText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    loginLink: {
        color: '#5FC793',
        fontSize: 14,
        fontWeight: '800',
    },
    primaryPillBtn: {
        backgroundColor: '#5FC793',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#5FC793',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    primaryPillText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: 1,
    },
    authContent: {
        flex: 1,
    },
    topoLine: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(95, 199, 147, 0.05)',
    },
    panelHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    panelTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
});
