import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        image: require('../../../../assets/images/onboarding_1.png'),
    },
    {
        id: '2',
        image: require('../../../../assets/images/onboarding_2.png'),
    },
    {
        id: '3',
        image: require('../../../../assets/images/onboarding_3.png'),
    },
];

interface OnboardingCarouselProps {
    isPaused: boolean;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export function OnboardingCarousel({ isPaused }: OnboardingCarouselProps) {
    const scrollX = useSharedValue(SCREEN_WIDTH);
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(1);
    const lastInteractionTime = useRef(Date.now());

    const EXTENDED_SLIDES = [
        { ...SLIDES[SLIDES.length - 1], key: 'clone-last' },
        ...SLIDES.map(s => ({ ...s, key: s.id })),
        { ...SLIDES[0], key: 'clone-first' }
    ];

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
        onBeginDrag: () => {
            lastInteractionTime.current = Date.now();
        },
    });

    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(() => {
            const timeSinceInteraction = Date.now() - lastInteractionTime.current;
            if (timeSinceInteraction < 5000) return;
            let nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        }, 5000);
        return () => clearInterval(interval);
    }, [currentIndex, isPaused]);

    const handleMomentumScrollEnd = (e: any) => {
        const offset = e.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SCREEN_WIDTH);
        if (index === 0) {
            flatListRef.current?.scrollToOffset({ offset: SLIDES.length * SCREEN_WIDTH, animated: false });
            setCurrentIndex(SLIDES.length);
        } else if (index === EXTENDED_SLIDES.length - 1) {
            flatListRef.current?.scrollToOffset({ offset: SCREEN_WIDTH, animated: false });
            setCurrentIndex(1);
        } else {
            setCurrentIndex(index);
        }
    };

    return (
        <View style={styles.container}>
            <AnimatedFlatList
                ref={flatListRef as any}
                data={EXTENDED_SLIDES}
                keyExtractor={(item: any) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                initialScrollIndex={1}
                renderItem={({ item, index }: any) => (
                    <Slide slide={item} index={index} scrollX={scrollX} />
                )}
                bounces={false}
                decelerationRate="fast"
                snapToAlignment="start"
                snapToInterval={SCREEN_WIDTH}
                removeClippedSubviews={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

function Slide({ slide, index, scrollX }: { slide: any, index: number, scrollX: any }) {
    const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
    ];

    const rStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollX.value, inputRange, [0.97, 1, 0.97], Extrapolate.CLAMP);
        return { opacity, transform: [{ scale: 1 }] };
    });

    return (
        <Animated.View style={[styles.slide, rStyle]}>
            <Image
                source={slide.image}
                style={styles.slideImage}
                resizeMode="cover"
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    list: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,           // was height: '100%' — flex:1 is more reliable inside FlatList
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    slideImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});
