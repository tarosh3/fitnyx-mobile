import { ArrowDown, ArrowUp, PlayCircle, Repeat, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

interface Props {
  visible: boolean;
  name: string;
  setsLogged: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onHowTo: () => void;
  onSwap: () => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** ⋯ on an exercise: everything secondary lives here, never in the main path. */
export function BlockMenuSheet({ visible, name, setsLogged, canMoveUp, canMoveDown, onHowTo, onSwap, onMove, onRemove, onClose }: Props) {
  const c = useThemeColors();
  const item = (Icon: typeof PlayCircle, label: string, hint: string | null, onPress: () => void, opts: { danger?: boolean; disabled?: boolean } = {}) => (
    <Pressable onPress={onPress} disabled={opts.disabled} accessibilityRole="button" accessibilityState={{ disabled: !!opts.disabled }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={({ pressed }) => [styles.item, { borderColor: c.border }, opts.disabled && { opacity: 0.45 }, pressed && { backgroundColor: c.surface }]}>
      <Icon size={22} color={opts.danger ? c.destructive : c.text} />
      <View style={styles.grow}>
        <Text style={[styles.label, { color: opts.danger ? c.destructive : c.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: c.mutedText }]}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
  return (
    <Sheet visible={visible} title={name} onClose={onClose} testID="block-menu">
      <View style={styles.list}>
        {item(PlayCircle, 'How to do it', 'Video and steps', onHowTo)}
        {item(Repeat, 'Swap exercise', setsLogged ? 'Only before you log a set' : 'Pick a different one', onSwap, { disabled: setsLogged > 0 })}
        {item(ArrowUp, 'Move up', null, () => onMove(-1), { disabled: !canMoveUp })}
        {item(ArrowDown, 'Move down', null, () => onMove(1), { disabled: !canMoveDown })}
        {item(Trash2, 'Remove from workout', setsLogged ? `Also deletes ${setsLogged} logged set${setsLogged === 1 ? '' : 's'}` : null, onRemove, { danger: true })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radii.lg, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1 },
  label: { fontFamily: type.weight.semibold, fontSize: 17 },
  hint: { fontFamily: type.weight.regular, fontSize: 14 },
});
