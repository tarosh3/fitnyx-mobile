import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface LogoProps {
    size?: number;
    color?: string;
    withText?: boolean;
}

/**
 * Premium standalone "F" Lightning Mark
 */
export function AppIconSvg({ size = 48, color = '#5fc793' }: LogoProps) {
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
export function FullLogoSvg({ size = 32, color = '#5fc793' }: LogoProps) {
    // We scale the text relative to the icon size
    const fontRatio = size * 0.8;
    const wordWidth = fontRatio * 4;

    return (
        <View style={[styles.fullLogoContainer, { height: size }]}>
            <AppIconSvg size={size} color={color} />

            {/* Custom geometric SVG Wordmark spelling FITNYX */}
            <Svg width={(134 * size) / 40} height={size} viewBox={`0 0 134 40`}>
                <Path
                    d="
                    M10,12 v16 h6 v-6 h8 v-4 h-8 v-2 h10 v-4 h-16 z
                    M30,12 v16 h6 v-16 h-6 z
                    M40,12 v4 h5 v12 h6 v-12 h5 v-4 h-16 z
                    M60,12 h6 l8,10 v-10 h6 v16 h-6 l-8,-10 v10 h-6 v-16 z
                    M84,12 h6 l4,6 l4,-6 h6 l-7,10 v6 h-6 v-6 l-7,-10 z
                    M104,12 h6 l4,6 l4,-6 h6 l-7,10 l7,6 h-6 l-4,-6 l-4,6 h-6 l7,-6 l-7,-10 z
                    "
                    fill="#FFFFFF"
                    transform={`translate(0, 4)`}
                />
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    fullLogoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
});
