import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { nudge, tickCount, tickOf, valueAtTick } from './ruler';

const TICK_W = 10;
const HEIGHT = 76;

interface RulerPickerProps {
  min: number;
  max: number;
  /** Value between two ticks. */
  step: number;
  /** Every n-th tick is long and labelled. */
  ticksPerLabel: number;
  value: number;
  onChange: (value: number) => void;
  formatLabel: (value: number) => string;
  /** Spoken value, e.g. "72.5 kilograms". */
  formatSpoken: (value: number) => string;
  accessibilityLabel: string;
}

/**
 * Horizontal ruler that snaps to each tick; the value under the centre line is
 * the selection. Drag for big moves — −/+ and typing live in the step. Ticks
 * are rendered in groups (one per label) so a 0.1 kg ruler stays a short list.
 */
export function RulerPicker({
  min, max, step, ticksPerLabel, value, onChange, formatLabel, formatSpoken, accessibilityLabel,
}: RulerPickerProps) {
  const palette = useThemeColors();
  const listRef = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  // Scroll events only change the value while the user moves the ruler, never
  // while it follows a typed / −/+ value (a typed 72.45 must not snap to 72.5).
  const dragging = useRef(false);
  const emitted = useRef<number | null>(null);
  const lastTick = useRef(tickOf(value, min, max, step));

  const ticks = tickCount(min, max, step);
  const groups = useMemo(
    () => Array.from({ length: Math.ceil((ticks + 1) / ticksPerLabel) }, (_, i) => i),
    [ticks, ticksPerLabel],
  );
  const groupW = ticksPerLabel * TICK_W;

  const scrollTo = useCallback((v: number, animated: boolean) => {
    dragging.current = false;
    lastTick.current = tickOf(v, min, max, step);
    listRef.current?.scrollToOffset({ offset: lastTick.current * TICK_W, animated });
  }, [min, max, step]);

  const placed = useRef(false);
  useEffect(() => {
    if (!width) return;
    if (placed.current && emitted.current === value) return;
    scrollTo(value, placed.current);
    placed.current = true;
  }, [value, width, scrollTo]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!dragging.current) return;
    const tick = Math.max(0, Math.min(ticks, Math.round(e.nativeEvent.contentOffset.x / TICK_W)));
    if (tick === lastTick.current) return;
    lastTick.current = tick;
    if (tick % ticksPerLabel === 0) haptic.selection();
    const next = valueAtTick(tick, min, max, step);
    emitted.current = next;
    onChange(next);
  };

  const onAction = (e: AccessibilityActionEvent) => {
    const dir = e.nativeEvent.actionName === 'increment' ? 1 : -1;
    onChange(nudge(value, dir, min, max, step));
  };

  const renderItem = useCallback(({ item }: { item: number }) => (
    <TickGroup
      group={item}
      ticksPerLabel={ticksPerLabel}
      lastTick={ticks}
      label={formatLabel(valueAtTick(item * ticksPerLabel, min, max, step))}
      tickColor={palette.mutedText}
      labelColor={palette.mutedText}
    />
  ), [ticksPerLabel, ticks, formatLabel, min, max, step, palette.mutedText]);

  const pad = Math.max(0, width / 2 - TICK_W / 2);
  const initialGroup = Math.floor(tickOf(value, min, max, step) / ticksPerLabel);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: formatSpoken(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.wrap, { backgroundColor: palette.card, borderColor: palette.border }]}
    >
      {width > 0 ? (
        <FlatList
          ref={listRef}
          testID="ruler-list"
          horizontal
          data={groups}
          keyExtractor={String}
          renderItem={renderItem}
          getItemLayout={(_, index) => ({ length: groupW, offset: groupW * index, index })}
          initialScrollIndex={initialGroup}
          initialNumToRender={Math.ceil(width / groupW) + 2}
          windowSize={7}
          contentContainerStyle={{ paddingHorizontal: pad }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_W}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollBeginDrag={() => { dragging.current = true; }}
          onMomentumScrollEnd={() => { dragging.current = false; }}
        />
      ) : null}
      <View pointerEvents="none" style={[styles.needle, { left: width / 2 - 1.5, backgroundColor: palette.primary }]} />
    </View>
  );
}

interface TickGroupProps {
  group: number;
  ticksPerLabel: number;
  lastTick: number;
  label: string;
  tickColor: string;
  labelColor: string;
}

const TickGroup = memo(function TickGroup({ group, ticksPerLabel, lastTick, label, tickColor, labelColor }: TickGroupProps) {
  const first = group * ticksPerLabel;
  const count = Math.min(ticksPerLabel, lastTick - first + 1);
  const half = ticksPerLabel % 2 === 0 ? ticksPerLabel / 2 : -1;
  return (
    <View style={[styles.group, { width: count * TICK_W }]}>
      {Array.from({ length: count }, (_, j) => (
        <View key={j} style={styles.slot}>
          <View
            style={[
              styles.tick,
              { backgroundColor: tickColor },
              j === 0 ? styles.major : j === half ? styles.mid : styles.minor,
            ]}
          />
        </View>
      ))}
      <Text numberOfLines={1} style={[styles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    height: HEIGHT,
    overflow: 'hidden',
  },
  group: {
    flexDirection: 'row',
    height: HEIGHT,
    overflow: 'visible',
  },
  slot: {
    alignItems: 'center',
    width: TICK_W,
  },
  tick: {
    borderRadius: 1,
    width: 2,
  },
  major: { height: 30, opacity: 0.9 },
  mid: { height: 20, opacity: 0.55 },
  minor: { height: 12, opacity: 0.35 },
  label: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    left: TICK_W / 2 - 24,
    position: 'absolute',
    textAlign: 'center',
    top: 38,
    width: 48,
  },
  needle: {
    borderRadius: 2,
    height: 42,
    position: 'absolute',
    top: 0,
    width: 3,
  },
});
