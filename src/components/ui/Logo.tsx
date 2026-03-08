import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface LogoProps {
    size?: number;
    color?: string;
    withText?: boolean;
}

/**
 * Premium standalone "F" Lightning Mark
 */
export function AppIconSvg({ size = 48, color = '#80f20d' }: LogoProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <Defs>
                <LinearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={color} stopOpacity="1" />
                    <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
                </LinearGradient>
            </Defs>
            {/* 
        Abstract geometric 'F' integrating a lightning bolt for momentum.
        Designed for sharp rendering at mobile favicon/app icon scales.
      */}
            <Path
                d="M25 20 L80 20 L70 40 L45 40 L65 60 L35 60 L50 90 L20 50 L45 50 L25 20 Z"
                fill="url(#glow)"
            />
        </Svg>
    );
}

/**
 * Full Logo with Wordmark for Headers and Main Branding
 */
export function FullLogoSvg({ size = 32, color = '#80f20d' }: LogoProps) {
    // We scale the text relative to the icon size
    const fontRatio = size * 0.8;
    const wordWidth = fontRatio * 4;

    return (
        <View style={[styles.fullLogoContainer, { height: size }]}>
            <AppIconSvg size={size} color={color} />
            <Text
                style={[
                    styles.wordmark,
                    {
                        fontSize: size * 1.15,
                        lineHeight: size * 1.2,
                    },
                ]}
            >
                FITNYX
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    fullLogoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    wordmark: {
        fontFamily: 'Anton_400Regular',
        color: '#FFFFFF',
        letterSpacing: 2,
        includeFontPadding: false,
    },
});
