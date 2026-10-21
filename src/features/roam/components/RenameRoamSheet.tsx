import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { MAX_ACTIVITY_NAME } from '@/src/features/roam/activityName';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  visible: boolean;
  /** Current name ('' when the Roam uses its default title). */
  initialName: string;
  /** What a blank name shows, e.g. "Morning Stride". */
  defaultName: string;
  saving: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onCancel: () => void;
}

/** Bottom sheet to rename a saved Roam. Blank = back to the default title. */
export function RenameRoamSheet({ visible, initialName, defaultName, saving, error, onSave, onCancel }: Props) {
  const c = useThemeColors();
  const [name, setName] = useState(initialName);
  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <Pressable style={styles.fill} onPress={onCancel} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>Name this Roam</Text>
          <TextInput
            testID="roam-rename-input"
            accessibilityLabel="Roam name"
            value={name}
            onChangeText={setName}
            placeholder={defaultName}
            placeholderTextColor={c.mutedText}
            maxLength={MAX_ACTIVITY_NAME}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => onSave(name)}
            editable={!saving}
            selectionColor={c.primary}
            style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          />
          <Text style={[styles.hint, { color: error ? c.destructive : c.mutedText }]}>
            {error ?? `Leave it blank to use "${defaultName}".`}
          </Text>
          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={onCancel} disabled={saving} style={styles.action} />
            <Button title="Save" onPress={() => onSave(name)} loading={saving} style={styles.action} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  action: { flex: 1 },
});
