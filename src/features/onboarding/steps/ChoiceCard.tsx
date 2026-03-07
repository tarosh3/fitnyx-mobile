import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

interface ChoiceCardProps {
  label: string;
  description?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
}

export function ChoiceCard({ label, description, emoji, selected, onPress }: ChoiceCardProps) {
  const palette = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: selected ? palette.primary : palette.border,
          backgroundColor: selected ? `${palette.primary}1A` : palette.card,
        },
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {description ? <Text style={[styles.description, { color: palette.mutedText }]}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emoji: {
    fontSize: 26,
    width: 36,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
});
