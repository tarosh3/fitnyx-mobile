import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import type { SaveStatus } from '@/src/components/ui/useSaveState';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

const LABELS: Record<Exclude<SaveStatus, 'saved'>, string> = {
  clean: 'No changes to save',
  dirty: 'Save changes',
  saving: 'Saving…',
  offline: "Offline — can't save",
  blocked: 'Save changes',
};

/** Pinned save button that always says where the form stands: nothing to save,
 *  changes waiting, saving, or saved. Errors show right above it, where the user is looking. */
export function SaveBar({ status, onSave, error, testID = 'save-bar' }: {
  status: SaveStatus; onSave: () => void; error?: string | null; testID?: string;
}) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} style={[styles.bar, { backgroundColor: c.background, borderColor: c.border, paddingBottom: insets.bottom + spacing.md }]}>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
      {status === 'saved' ? (
        <View testID={`${testID}-saved`} accessible accessibilityRole="text" accessibilityLabel="Saved" accessibilityLiveRegion="polite"
          style={[styles.saved, { backgroundColor: c.accentSoft }]}>
          <Check size={18} color={c.accent} strokeWidth={2.5} />
          <Text style={[styles.savedText, { color: c.accent }]}>Saved</Text>
        </View>
      ) : (
        <Button testID={`${testID}-button`} title={LABELS[status]} onPress={onSave} loading={status === 'saving'}
          disabled={status !== 'dirty'} accessibilityState={{ disabled: status !== 'dirty', busy: status === 'saving' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.base, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  error: { fontFamily: type.weight.semibold, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  saved: { minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  savedText: { fontFamily: type.weight.bold, fontSize: 16 },
});
