import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface Props {
  icon: LucideIcon;
  tone: 'success' | 'error';
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}

/** Full-screen outcome of an email link (verified / failed): icon, message, one action. */
export function AuthResultCard({ icon: Icon, tone, title, body, actionLabel, onAction }: Props) {
  const palette = useThemeColors();
  const color = tone === 'success' ? palette.primary : palette.destructive;
  return (
    <Screen scroll={false} contentContainerStyle={styles.center}>
      <View style={styles.content}>
        <View style={[styles.halo, { backgroundColor: `${color}10`, borderColor: `${color}26` }]}>
          <View style={[styles.badge, { backgroundColor: `${color}1F` }]}>
            <Icon size={34} color={color} strokeWidth={2} />
          </View>
        </View>
        <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[styles.body, { color: palette.mutedText }]}>{body}</Text>
        <Button title={actionLabel} onPress={onAction} style={styles.action} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', alignItems: 'center', paddingHorizontal: 8 },
  halo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  badge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, maxWidth: 320 },
  action: { alignSelf: 'stretch', marginTop: 32 },
});
