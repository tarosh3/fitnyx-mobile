import { ProIcon } from '@/src/features/pro/ProIcon';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

/** Under Filo's composer on the free plan: messages left today, then Get Pro. */
export function FiloAllowance({ left, onSeePro }: { left: number; onSeePro: () => void }) {
  const c = useThemeColors();
  return (
    <View style={styles.row} accessibilityLiveRegion="polite" testID="filo-allowance">
      <Text style={[styles.text, { color: c.mutedText }]}>
        {left > 0 ? `${left} free ${left === 1 ? 'message' : 'messages'} left today` : "That's today's free messages"}
      </Text>
      <Pressable onPress={onSeePro} accessibilityRole="button" accessibilityLabel="Get Pro for unlimited messages" hitSlop={8} style={styles.link}>
        <ProIcon size={14} color={c.accent} />
        <Text style={[styles.linkText, { color: c.accent }]}>{left > 0 ? 'Unlimited with Pro' : 'Get Pro'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', minHeight: 24 },
  text: { fontFamily: type.weight.medium, fontSize: 12.5 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontFamily: type.weight.bold, fontSize: 12.5 },
});
