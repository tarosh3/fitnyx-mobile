import { CircleAlert, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { PhotoMealItem } from '@/src/lib/api/diet';
import { radii, spacing, type } from '@/src/styles/tokens';
import { FoodRow } from '../log/FoodRow';
import { PHOTO_ERRORS, type PhotoErrorKind } from './model';

const MAX_HINT = 120;

export function ReadingCard() {
  const c = useThemeColors();
  return (
    <View style={[styles.card, styles.center, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.primary} size="large" />
      <Text style={[styles.title, { color: c.text }]}>Reading your plate…</Text>
      <Text style={[styles.body, { color: c.mutedText }]}>This takes a few seconds.</Text>
    </View>
  );
}

export function PhotoError({ kind, onRetry, onBack, onPro }: { kind: PhotoErrorKind; onRetry: () => void; onBack: () => void; onPro?: () => void }) {
  const c = useThemeColors();
  const { title, body } = PHOTO_ERRORS[kind];
  // A retry can't help once today's photos are used, or with the same foodless photo.
  const canRetry = kind !== 'limit' && kind !== 'no_food' && kind !== 'pro';
  return (
    <View style={[styles.card, styles.center, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
      <CircleAlert size={28} color={c.destructive} />
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.body, { color: c.mutedText }]}>{body}</Text>
      <View style={styles.actions}>
        {canRetry ? <Pill label="Try again" onPress={onRetry} primary /> : null}
        {kind === 'pro' && onPro ? <Pill label="See Pro" onPress={onPro} primary /> : null}
        <Pill label={kind === 'no_food' ? 'Pick another photo' : 'Search instead'} onPress={onBack} primary={!canRetry && kind !== 'pro'} />
      </View>
    </View>
  );
}

/** The foods found: each kept at 1× (stepper) or removed (toggle). */
export function PhotoItems({ items, qty, onQty }: { items: PhotoMealItem[]; qty: (number | null)[]; onQty: (i: number, q: number | null) => void }) {
  const c = useThemeColors();
  return (
    <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>
      {items.map((it, i) => (
        <FoodRow key={`${i}-${it.name}`} first={i === 0} qty={qty[i] ?? null}
          food={{ ...it, portion_label: [it.confidence === 'low' ? 'Unsure' : '', it.portion_label, it.grams ? `${Math.round(it.grams)} g` : ''].filter(Boolean).join(' · ') }}
          onToggle={() => onQty(i, qty[i] === null ? 1 : null)} onQty={(q) => onQty(i, q)} />
      ))}
    </View>
  );
}

/** "Not quite right?" → a note ("2 rotis, made with ghee") and another read. */
export function HintBox({ onRead }: { onRead: (hint: string) => void }) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState('');
  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.link}>
        <Sparkles size={16} color={c.accent} />
        <Text style={[styles.linkText, { color: c.accent }]}>Not quite right? Describe the meal and read again</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: c.surface, gap: spacing.sm }]}>
      <TextInput value={hint} onChangeText={(t) => setHint(t.slice(0, MAX_HINT))} placeholder="e.g. 2 rotis and paneer sabzi, made with ghee"
        placeholderTextColor={c.mutedText} accessibilityLabel="Describe the meal" multiline
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]} />
      <Pill label="Read again" onPress={() => onRead(hint.trim())} primary disabled={!hint.trim()} />
    </View>
  );
}

function Pill({ label, onPress, primary, disabled }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.pill, primary ? { backgroundColor: c.primary } : { borderWidth: 1, borderColor: c.border },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.75 }]}>
      <Text style={[styles.pillText, { color: primary ? c.primaryText : c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, padding: spacing.lg },
  center: { alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: type.weight.bold, fontSize: 18, textAlign: 'center' },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  list: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  linkText: { fontFamily: type.weight.semibold, fontSize: 14, flexShrink: 1 },
  input: { minHeight: 72, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: type.weight.regular, fontSize: 15, textAlignVertical: 'top' },
  pill: { minHeight: 48, borderRadius: radii.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
