import { Download, Wrench } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { checkForOtaUpdate } from './ota';
import { loadCachedAppConfig, refreshAppConfig, useAppNotices } from './store';

/**
 * Root overlay (app/_layout.tsx): loads the remote app config at launch and on
 * every return to the foreground, checks for OTA updates, and covers the whole
 * app when this build is below min_version or maintenance is on.
 */
export function AppGate() {
  const { block } = useAppNotices();

  useEffect(() => {
    void loadCachedAppConfig().then(refreshAppConfig);
    void checkForOtaUpdate();
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      void refreshAppConfig();
      void checkForOtaUpdate();
    });
    return () => sub.remove();
  }, []);

  if (!block) return null;
  return block.kind === 'update'
    ? <BlockScreen
        testID="app-gate-update"
        icon="update"
        title="Update required"
        message="This version of FitNyx is no longer supported. Update to keep training — your data is safe."
        action="Update FitNyx"
        onAction={() => { void Linking.openURL(block.url).catch(() => undefined); }}
      />
    : <BlockScreen
        testID="app-gate-maintenance"
        icon="maintenance"
        title="We'll be right back"
        message={block.message}
        action="Try again"
        onAction={refreshAppConfig}
      />;
}

function BlockScreen({ testID, icon, title, message, action, onAction }: {
  testID: string; icon: 'update' | 'maintenance'; title: string; message: string; action: string;
  onAction: () => void | Promise<void>;
}) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const Icon = icon === 'update' ? Download : Wrench;
  const press = async () => {
    setBusy(true);
    try { await onAction(); } finally { setBusy(false); }
  };
  return (
    <View
      testID={testID}
      accessibilityViewIsModal
      style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
          <Icon size={30} color={c.accent} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{title}</Text>
        <Text style={[styles.message, { color: c.mutedText }]}>{message}</Text>
      </View>
      <Button title={action} loading={busy} onPress={press} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000, paddingHorizontal: spacing.xl },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  icon: { width: 72, height: 72, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { fontFamily: type.weight.extrabold, fontSize: type.size.h2, textAlign: 'center' },
  message: { fontFamily: type.weight.medium, fontSize: type.size.body, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  button: { flexGrow: 0 },
});
