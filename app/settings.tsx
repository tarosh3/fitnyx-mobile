import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { Bell, Brain, ChevronLeft, ChevronRight, FileText, LogOut, Moon, Shield, Sun, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SettingsScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  const { user, avatarUrl, signOut } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check actual device notification permission on mount
  const checkPermission = useCallback(async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      setNotificationsEnabled(
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch {
      setNotificationsEnabled(false);
    }
  }, []);

  useEffect(() => { checkPermission(); }, [checkPermission]);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const settings = await notifee.requestPermission();
      const granted =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
      setNotificationsEnabled(granted);
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              if (Platform.OS === 'ios') Linking.openURL('app-settings:');
              else Linking.openSettings();
            }},
          ]
        );
      }
    } else {
      // Can't revoke programmatically — direct user to settings
      Alert.alert(
        'Disable Notifications',
        'To disable notifications, please turn them off in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            if (Platform.OS === 'ios') Linking.openURL('app-settings:');
            else Linking.openSettings();
          }},
        ]
      );
    }
  };

  // Neon Lime Accent
  const neonLime = palette.primary;

  const firstName = user?.user_metadata?.first_name || 'User';
  const lastName = user?.user_metadata?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'fitnyx-user';

  const styles = React.useMemo(() => getStyles(palette, neonLime), [palette, neonLime]);

  return (
    <Screen scroll={true} contentContainerStyle={[styles.screenContent, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} style={styles.backButton}>
          <ChevronLeft color={palette.text} size={24} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>PREFERENCES & ACCOUNT</Text>
        </View>
      </View>

      <Pressable onPress={() => router.push('/profile')} style={styles.profileSection}>
        <View style={[styles.avatarContainer, { borderColor: neonLime }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <User color={neonLime} size={32} strokeWidth={1.5} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.fullName}>{fullName || 'FitNyx User'}</Text>
          <Text style={styles.username}>@{username}</Text>
        </View>
        <View style={styles.editBadge}>
          <Text style={[styles.editText, { color: neonLime }]}>EDIT</Text>
        </View>
      </Pressable>

      <View style={styles.groupsContainer}>
        <View style={styles.groupLabelContainer}>
          <Text style={styles.groupLabel}>PREFERENCES</Text>
        </View>
        <BlurView intensity={10} tint={theme === 'dark' ? 'dark' : 'light'} style={styles.glassCard}>
          <Row
            styles={styles} palette={palette}
            icon={<Bell color={palette.text} size={20} strokeWidth={1.5} />}
            label="Notifications"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: palette.border, true: `${neonLime}44` }}
                thumbColor={notificationsEnabled ? neonLime : '#f4f4f5'}
              />
            }
          />
          <View style={styles.divider} />
          <Row
            styles={styles} palette={palette}
            icon={<Brain color={palette.text} size={20} strokeWidth={1.5} />}
            label="Coach Memory"
            onPress={() => router.push('/settings/coach-memory' as any)}
          />
          <View style={styles.divider} />
          <Row
            styles={styles} palette={palette}
            icon={theme === 'dark' ? <Moon color={palette.text} size={20} strokeWidth={1.5} /> : <Sun color={palette.text} size={20} strokeWidth={1.5} />}
            label="Dark Mode"
            right={
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: palette.border, true: `${neonLime}44` }}
                thumbColor={theme === 'dark' ? neonLime : '#f4f4f5'}
              />
            }
          />
        </BlurView>

        <View style={[styles.groupLabelContainer, { marginTop: 32 }]}>
          <Text style={styles.groupLabel}>LEGAL</Text>
        </View>
        <BlurView intensity={10} tint={theme === 'dark' ? 'dark' : 'light'} style={styles.glassCard}>
          <Row
            styles={styles} palette={palette}
            icon={<FileText color={palette.text} size={20} strokeWidth={1.5} />}
            label="Terms of Service"
            onPress={() => router.push('/terms-of-service')}
          />
          <View style={styles.divider} />
          <Row
            styles={styles} palette={palette}
            icon={<Shield color={palette.text} size={20} strokeWidth={1.5} />}
            label="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />
        </BlurView>

        <View style={[styles.groupLabelContainer, { marginTop: 32 }]}>
          <Text style={styles.groupLabel}>ACCOUNT</Text>
        </View>
        <BlurView intensity={10} tint={theme === 'dark' ? 'dark' : 'light'} style={styles.glassCard}>
          <Row
            styles={styles} palette={palette}
            icon={<Shield color="#EF4444" size={20} strokeWidth={1.5} />}
            label="Delete Account"
            onPress={() => router.push('/delete-account')}
            danger
          />
        </BlurView>
      </View>

      <Pressable
        onPress={async () => {
          await signOut();
        }}
        style={({ pressed }) => [
          styles.logoutButton,
          { opacity: pressed ? 0.7 : 1 }
        ]}
      >
        <LogOut color="#EF4444" size={20} strokeWidth={2} />
        <Text style={styles.logoutText}>LOG OUT</Text>
      </Pressable>

      <View style={styles.footerBrand}>
        <Image
          source={require('@/assets/images/fitnyx_logo_4k_transparent.png')}
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={styles.versionText}>v1.0.0 — FITNYX</Text>
      </View>
    </Screen>
  );
}

function Row({
  icon,
  label,
  right,
  onPress,
  danger,
  styles,
  palette,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  styles: any;
  palette: any;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrapper}>{icon}</View>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      </View>
      {right || (onPress ? <ChevronRight color={palette.mutedText} size={20} /> : null)}
    </Pressable>
  );
}

const getStyles = (palette: any, neonLime: string) => StyleSheet.create({
  screenContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: palette.text,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: palette.mutedText,
    letterSpacing: 2,
    marginTop: 4,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '900',
    color: palette.text,
  },
  username: {
    fontSize: 14,
    color: palette.mutedText,
    marginTop: 2,
  },
  editBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: palette.surface,
  },
  editText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  groupsContainer: {
    marginBottom: 40,
  },
  groupLabelContainer: {
    marginBottom: 12,
    marginLeft: 4,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: palette.mutedText,
    letterSpacing: 1.5,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 24,
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginLeft: 14,
  },
  dangerText: {
    color: palette.destructive,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.destructive,
    backgroundColor: 'transparent',
    gap: 12,
  },
  logoutText: {
    color: palette.destructive,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  footerBrand: {
    marginTop: 64,
    alignItems: 'center',
    opacity: 0.6,
  },
  footerLogo: {
    width: 120,
    height: 40,
  },
  versionText: {
    color: palette.mutedText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 16,
    textTransform: 'uppercase',
  },
});
