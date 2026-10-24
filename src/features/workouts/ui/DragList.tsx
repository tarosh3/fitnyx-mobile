import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  measure, runOnJS, scrollTo, useAnimatedRef, useAnimatedStyle, useFrameCallback, useScrollViewOffset, useSharedValue, withTiming,
} from 'react-native-reanimated';

import { dropIndex, makeRoomShift, slotOffset } from '@/src/features/workouts/ui/dragOrder';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';

const LIFT_MS = 300; // hold this long before the item follows the finger
const EDGE = 96; // auto-scroll zone at the top and bottom of the list
const MAX_STEP = 14; // auto-scroll px per frame with the finger at the very edge
const SETTLE = { duration: 180 };

/**
 * Hold-and-drag reordering for a vertical list inside an Animated.ScrollView:
 * spread `scrollProps` on the ScrollView and wrap each item in `DragItem`.
 * The order changes only on drop (`onMove`); while dragging, the other items
 * slide out of the way and the list scrolls when the finger nears an edge.
 */
export function useDragList({ count, gap, enabled, onMove }: { count: number; gap: number; enabled: boolean; onMove: (from: number, to: number) => void }) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollViewOffset(scrollRef);
  const active = useSharedValue(-1);
  const target = useSharedValue(-1);
  const offset = useSharedValue(0);
  const dropping = useSharedValue(false);
  const tops = useSharedValue<number[]>([]);
  const heights = useSharedValue<number[]>([]);
  const panY = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const scrollPos = useSharedValue(0);
  const viewTop = useSharedValue(0);
  const viewH = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const contentH = useSharedValue(0);
  const [dragging, setDragging] = useState(false);
  const settled = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    tops.modify((a) => { 'worklet'; a.length = Math.min(a.length, count); return a; });
    heights.modify((a) => { 'worklet'; a.length = Math.min(a.length, count); return a; });
  }, [count]);

  // Reset only once the new order has rendered: resetting first showed the old order for a frame.
  useLayoutEffect(() => {
    if (!settled.current) return;
    settled.current = false;
    active.value = -1;
    target.value = -1;
    offset.value = 0;
    dropping.value = false;
  });

  const lift = useCallback(() => { haptic.medium(); setDragging(true); }, []);
  const commit = useCallback((from: number, to: number) => {
    settled.current = true;
    if (from !== to) onMoveRef.current(from, to);
    setDragging(false);
  }, []);

  const follow = () => {
    'worklet';
    offset.value = panY.value + scrollPos.value - startScroll.value;
    const to = dropIndex(active.value, offset.value, tops.value, heights.value);
    if (to !== target.value) {
      target.value = to;
      runOnJS(haptic.selection)();
    }
  };

  useFrameCallback(() => {
    if (active.value < 0 || dropping.value) return;
    const f = fingerY.value;
    const h = viewH.value;
    const step = f < EDGE ? -MAX_STEP * Math.min(1, (EDGE - f) / EDGE) : f > h - EDGE ? MAX_STEP * Math.min(1, (f - h + EDGE) / EDGE) : 0;
    if (!step) return;
    const next = Math.min(Math.max(0, contentH.value - h), Math.max(0, scrollPos.value + step));
    if (next === scrollPos.value) return;
    scrollPos.value = next;
    scrollTo(scrollRef, 0, next, false);
    follow();
  });

  const gesture = useCallback((index: number) => Gesture.Pan()
    .activateAfterLongPress(LIFT_MS)
    .enabled(enabled)
    .onStart((e) => {
      const m = measure(scrollRef);
      if (!m || active.value >= 0) return;
      viewTop.value = m.pageY;
      viewH.value = m.height;
      startScroll.value = scrollY.value;
      scrollPos.value = scrollY.value;
      panY.value = 0;
      offset.value = 0;
      fingerY.value = e.absoluteY - m.pageY;
      target.value = index;
      active.value = index;
      runOnJS(lift)();
    })
    .onUpdate((e) => {
      if (active.value !== index || dropping.value) return;
      panY.value = e.translationY;
      fingerY.value = e.absoluteY - viewTop.value;
      follow();
    })
    .onFinalize(() => {
      if (active.value !== index || dropping.value) return;
      dropping.value = true;
      const to = target.value;
      offset.value = withTiming(slotOffset(index, to, tops.value, heights.value), SETTLE, () => runOnJS(commit)(index, to));
    }), [enabled]);

  const measureItem = useCallback((index: number, e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    tops.modify((a) => { 'worklet'; a[index] = y; return a; });
    heights.modify((a) => { 'worklet'; a[index] = height; return a; });
  }, []);

  return {
    dragging, gap, gesture, measureItem, active, target, offset, heights,
    scrollRef,
    scrollProps: {
      ref: scrollRef,
      scrollEnabled: !dragging,
      onContentSizeChange: (_w: number, h: number) => { contentH.value = h; },
    },
  };
}

export type DragList = ReturnType<typeof useDragList>;

/** One reorderable item; `children` gets the gesture to attach to its handle (e.g. the card's header). */
export function DragItem({ drag, index, onLayout, children }: {
  drag: DragList; index: number; onLayout?: (e: LayoutChangeEvent) => void; children: (gesture: GestureType) => React.ReactNode;
}) {
  const c = useThemeColors();
  const { active, target, offset, heights, gap } = drag;
  const gesture = useMemo(() => drag.gesture(index), [drag.gesture, index]);
  const style = useAnimatedStyle(() => {
    const a = active.value;
    if (a === index) {
      return { zIndex: 10, elevation: 12, shadowOpacity: 0.3, transform: [{ translateY: offset.value }, { scale: withTiming(1.03, SETTLE) }] };
    }
    const shift = a < 0 ? 0 : withTiming(makeRoomShift(index, a, target.value, (heights.value[a] ?? 0) + gap), SETTLE);
    return { zIndex: 0, elevation: 0, shadowOpacity: 0, transform: [{ translateY: shift }, { scale: a < 0 ? withTiming(1, SETTLE) : 1 }] };
  });
  return (
    <Animated.View style={[{ shadowColor: c.nav.shadow, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, style]}
      onLayout={(e) => { drag.measureItem(index, e); onLayout?.(e); }}>
      {children(gesture)}
    </Animated.View>
  );
}
