import { Check, Minus, Plus, Timer } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { haptic } from '@/src/lib/haptics';
import { radii, spacing, type as t } from '@/src/styles/tokens';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  seconds: number;
  onDismiss: () => void;
}

// Sticky rest countdown shown after logging a set. Self-contained: ticks down,
// pulses haptics on finish, then auto-dismisses. ±15s + Skip controls.
export function RestTimer({ seconds, onDismiss }: Props) {
  const c = useThemeColors();
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const finished = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (!finished.current) {
            finished.current = true;
            haptic.success();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0) {
      const id = setTimeout(onDismiss, 1600);
      return () => clearTimeout(id);
    }
  }, [remaining, onDismiss]);

  // Grow the bar's denominator when extending past the original duration, so
  // the drain bar never overflows.
  useEffect(() => {
    setTotal((tot) => Math.max(tot, remaining));
  }, [remaining]);

  const adjust = (delta: number) => {
    finished.current = false;
    // Functional updater — reading `remaining` from the render closure would
    // overwrite a tick that landed between render and press.
    setRemaining((r) => Math.max(1, r + delta));
  };

  const done = remaining === 0;
  // Drain the bar as time runs out (full -> empty).
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <View style={[styles.wrap, { backgroundColor: c.card, borderColor: done ? c.primary : c.border }]}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: c.primary }]} />
      </View>
      <View style={styles.row}>
        <View style={styles.left}>
          {done ? <Check size={18} color={c.primary} /> : <Timer size={18} color={c.primary} />}
          <View>
            <Text style={[styles.label, { color: c.mutedText }]}>{done ? 'REST DONE' : 'REST'}</Text>
            <Text style={[styles.time, { color: c.text }]}>{fmt(remaining)}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          {!done ? (
            <>
              <Pressable onPress={() => adjust(-15)} style={[styles.ctrl, { borderColor: c.border }]}>
                <Minus size={14} color={c.text} />
                <Text style={[styles.ctrlText, { color: c.text }]}>15</Text>
              </Pressable>
              <Pressable onPress={() => adjust(15)} style={[styles.ctrl, { borderColor: c.border }]}>
                <Plus size={14} color={c.text} />
                <Text style={[styles.ctrlText, { color: c.text }]}>15</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={onDismiss} style={[styles.skip, { backgroundColor: c.primary }]}>
            <Text style={[styles.skipText, { color: c.primaryText }]}>{done ? 'DONE' : 'SKIP'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: 28,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 8,
  },
  track: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)' },
  fill: { height: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { fontFamily: t.weight.semibold, fontSize: 10, letterSpacing: t.tracking.eyebrow },
  time: { fontFamily: t.weight.extrabold, fontSize: t.size.h3, letterSpacing: t.tracking.tight },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ctrl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ctrlText: { fontFamily: t.weight.bold, fontSize: t.size.xs },
  skip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
  },
  skipText: { fontFamily: t.weight.extrabold, fontSize: t.size.xs, letterSpacing: 0.5 },
});
