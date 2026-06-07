import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  AlarmClock,
  Bell,
  Brain,
  ChevronLeft,
  Droplet,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  Mail,
  Moon,
  Ruler,
  Share2,
  Shield,
  Star,
  User,
  UserCog,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Screen } from '@/src/components/ui/Screen';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { SettingGroup } from '@/src/components/ui/SettingGroup';
import { SettingRow } from '@/src/components/ui/SettingRow';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { formatHeight, formatWeight, useHeightUnit, useLanguage, useWeightUnit } from '@/src/lib/prefs';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { elevation, radii, spacing, type as t } from '@/src/styles/tokens';

type Language = 'en' | 'hi' | 'hi_en';
const LANG_LABEL: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
  hi_en: 'Hinglish',
};

export default function SettingsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  const { user, avatarUrl, userProfile, signOut } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const [weightUnit, setWeightUnit] = useWeightUnit();
  const [heightUnit, setHeightUnit] = useHeightUnit();
  const [language, setLanguage] = useLanguage();

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

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const settings = await notifee.requestPermission();
      const granted =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
      setNotificationsEnabled(granted);
      if (!granted) openSystemSettings('Notifications Disabled');
    } else {
      openSystemSettings('Disable Notifications');
    }
  };

  function openSystemSettings(title: string) {
    Alert.alert(
      title,
      'To change this, open device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') Linking.openURL('app-settings:');
            else Linking.openSettings();
          },
        },
      ]
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Train smarter with FitNyx — your AI fitness coach. https://fitnyx.app',
      });
    } catch {
      /* user cancelled */
    }
  };

  const handleRate = () => {
    const url =
      Platform.OS === 'ios'
        ? 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID?action=write-review'
        : 'market://details?id=com.fitnyx.app';
    Linking.openURL(url).catch(() => Alert.alert('Could not open store'));
  };

  const handleContact = () => {
    Linking.openURL('mailto:support@fitnyx.app?subject=FitNyx Support');
  };

  const firstName = userProfile?.first_name || user?.user_metadata?.first_name || 'User';
  const lastName = userProfile?.last_name || user?.user_metadata?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const username =
    userProfile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'fitnyx-user';

  const unitSummary = useMemo(
    () => `${weightUnit.toUpperCase()} · ${heightUnit.toUpperCase()}`,
    [weightUnit, heightUnit]
  );

  return (
    <Screen scroll contentContainerStyle={[styles.screen, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/dashboard'))}
          style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <ChevronLeft size={22} color={c.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.mutedText }]}>PREFERENCES & ACCOUNT</Text>
          <Text style={[styles.h1, { color: c.text }]}>Settings</Text>
        </View>
      </View>

      {/* Profile card */}
      <PressableScale
        onPress={() => router.push('/profile')}
        style={[styles.profileCard, { backgroundColor: c.card, borderColor: c.border }, elevation.sm]}
      >
        <View style={[styles.avatarRing, { borderColor: c.primary }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: c.surface }]}>
              <User color={c.primary} size={28} strokeWidth={1.8} />
            </View>
          )}
        </View>
        <View style={styles.profileText}>
          <Text style={[styles.profileName, { color: c.text }]}>{fullName || 'FitNyx User'}</Text>
          <Text style={[styles.profileHandle, { color: c.mutedText }]}>@{username}</Text>
          {userProfile?.bio ? (
            <Text style={[styles.profileBio, { color: c.mutedText }]} numberOfLines={1}>
              {userProfile.bio}
            </Text>
          ) : null}
        </View>
        <View style={[styles.editPill, { backgroundColor: `${c.primary}1A` }]}>
          <Text style={[styles.editPillText, { color: c.primary }]}>EDIT</Text>
        </View>
      </PressableScale>

      {/* ACCOUNT */}
      <SectionHeader eyebrow="Account" />
      <SettingGroup>
        <SettingRow
          icon={<UserCog size={20} color={c.primary} strokeWidth={1.8} />}
          label="Edit Profile"
          description="Name, username, bio, contact"
          onPress={() => router.push('/profile')}
          showChevron
        />
        <SettingRow
          icon={<Activity size={20} color={c.primary} strokeWidth={1.8} />}
          label="Fitness Profile"
          description="Goals, experience, equipment"
          onPress={() => router.push('/fitness-profile' as any)}
          showChevron
        />
        <SettingRow
          icon={<Ruler size={20} color={c.primary} strokeWidth={1.8} />}
          label="Body Stats"
          description="Weight, measurements, progress"
          onPress={() => router.push('/dashboard/stats')}
          showChevron
        />
      </SettingGroup>

      {/* HABITS */}
      <SectionHeader eyebrow="Habits" />
      <SettingGroup>
        <SettingRow
          icon={<AlarmClock size={20} color={c.primary} strokeWidth={1.8} />}
          label="Reminders"
          description="Workout, water, food, snack, custom"
          onPress={() => router.push('/reminders' as any)}
          showChevron
        />
        <SettingRow
          icon={<Droplet size={20} color={c.primary} strokeWidth={1.8} />}
          label="Water Tracker"
          description="Log intake, daily goal, monthly graph"
          onPress={() => router.push('/water' as any)}
          showChevron
        />
      </SettingGroup>

      {/* PREFERENCES */}
      <SectionHeader eyebrow="Preferences" />
      <SettingGroup>
        <SettingRow
          icon={<Bell size={20} color={c.primary} strokeWidth={1.8} />}
          label="Notifications"
          description="Reminders, AI coach pings"
          switchValue={notificationsEnabled}
          onSwitchChange={handleToggleNotifications}
        />
        <SettingRow
          icon={<Moon size={20} color={c.primary} strokeWidth={1.8} />}
          label="Dark Mode"
          switchValue={theme === 'dark'}
          onSwitchChange={toggleTheme}
        />
        <SettingRow
          icon={<Ruler size={20} color={c.primary} strokeWidth={1.8} />}
          label="Units of Measurement"
          value={unitSummary}
          onPress={() => setUnitsOpen(true)}
          showChevron
        />
        <SettingRow
          icon={<Globe size={20} color={c.primary} strokeWidth={1.8} />}
          label="Language"
          value={LANG_LABEL[language]}
          onPress={() => setLangOpen(true)}
          showChevron
        />
        <SettingRow
          icon={<Brain size={20} color={c.primary} strokeWidth={1.8} />}
          label="Coach Memory"
          description="What Filo remembers about you"
          onPress={() => router.push('/settings/coach-memory' as any)}
          showChevron
        />
      </SettingGroup>

      {/* SUPPORT */}
      <SectionHeader eyebrow="Support" />
      <SettingGroup>
        <SettingRow
          icon={<HelpCircle size={20} color={c.primary} strokeWidth={1.8} />}
          label="Help & FAQ"
          onPress={() => Linking.openURL('https://fitnyx.app/help')}
          showChevron
        />
        <SettingRow
          icon={<Mail size={20} color={c.primary} strokeWidth={1.8} />}
          label="Contact Support"
          onPress={handleContact}
          showChevron
        />
        <SettingRow
          icon={<Star size={20} color={c.primary} strokeWidth={1.8} />}
          label="Rate the App"
          onPress={handleRate}
          showChevron
        />
        <SettingRow
          icon={<Share2 size={20} color={c.primary} strokeWidth={1.8} />}
          label="Share FitNyx"
          onPress={handleShare}
          showChevron
        />
      </SettingGroup>

      {/* LEGAL */}
      <SectionHeader eyebrow="Legal" />
      <SettingGroup>
        <SettingRow
          icon={<FileText size={20} color={c.primary} strokeWidth={1.8} />}
          label="Terms of Service"
          onPress={() => router.push('/terms-of-service')}
          showChevron
        />
        <SettingRow
          icon={<Shield size={20} color={c.primary} strokeWidth={1.8} />}
          label="Privacy Policy"
          onPress={() => router.push('/privacy-policy')}
          showChevron
        />
      </SettingGroup>

      {/* DANGER */}
      <SectionHeader eyebrow="Danger Zone" />
      <SettingGroup>
        <SettingRow
          icon={<LogOut size={20} color={c.destructive} strokeWidth={1.8} />}
          label="Sign Out"
          destructive
          onPress={() => setSignOutOpen(true)}
          showChevron
        />
        <SettingRow
          icon={<Shield size={20} color={c.destructive} strokeWidth={1.8} />}
          label="Delete Account"
          description="Permanent. Cannot be undone."
          destructive
          onPress={() => router.push('/delete-account')}
          showChevron
        />
      </SettingGroup>

      {/* Footer */}
      <View style={styles.footer}>
        <Image
          source={require('@/assets/images/fitnyx_logo_4k_transparent.png')}
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={[styles.versionText, { color: c.mutedText }]}>v1.0.0 — FITNYX</Text>
      </View>

      {/* Units sheet */}
      <PickerSheet visible={unitsOpen} onClose={() => setUnitsOpen(false)} title="Units">
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.eyebrow, { color: c.mutedText }]}>WEIGHT</Text>
            <SegmentedControl
              options={[
                { label: 'Kilograms', value: 'kg' },
                { label: 'Pounds', value: 'lbs' },
              ]}
              value={weightUnit}
              onChange={setWeightUnit}
            />
            <Text style={[styles.helper, { color: c.mutedText }]}>
              Preview: {formatWeight(74, weightUnit)}
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.eyebrow, { color: c.mutedText }]}>HEIGHT</Text>
            <SegmentedControl
              options={[
                { label: 'Centimeters', value: 'cm' },
                { label: 'Feet & inches', value: 'ft' },
              ]}
              value={heightUnit}
              onChange={setHeightUnit}
            />
            <Text style={[styles.helper, { color: c.mutedText }]}>
              Preview: {formatHeight(180, heightUnit)}
            </Text>
          </View>
        </View>
      </PickerSheet>

      {/* Language sheet */}
      <PickerSheet visible={langOpen} onClose={() => setLangOpen(false)} title="Language">
        <View style={{ gap: spacing.sm }}>
          {(['en', 'hi', 'hi_en'] as const).map((code) => (
            <Pressable
              key={code}
              onPress={() => {
                setLanguage(code);
                setLangOpen(false);
              }}
              style={[
                styles.langRow,
                {
                  backgroundColor: language === code ? `${c.primary}1A` : c.surface,
                  borderColor: language === code ? c.primary : c.border,
                },
              ]}
            >
              <Text style={[styles.langLabel, { color: c.text }]}>{LANG_LABEL[code]}</Text>
              {language === code ? (
                <View style={[styles.langDot, { backgroundColor: c.primary }]} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </PickerSheet>

      <ConfirmModal
        visible={signOutOpen}
        variant="danger"
        title="Sign out?"
        message="You'll need to log back in to reach your workouts, water log and AI coach."
        confirmLabel="Sign out"
        cancelLabel="Stay"
        onCancel={() => setSignOutOpen(false)}
        onConfirm={() => {
          setSignOutOpen(false);
          signOut();
        }}
      />
    </Screen>
  );
}

function PickerSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const c = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: c.text }]}>{title}</Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.sheetDone, { color: c.primary }]}>Done</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: spacing.lg }}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: spacing['3xl'],
    paddingHorizontal: 0,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: t.weight.extrabold,
    fontSize: t.size.h1,
    letterSpacing: t.tracking.tight,
    marginTop: 2,
  },
  helper: {
    fontFamily: t.weight.regular,
    fontSize: t.size.xs,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 3,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: t.weight.bold,
    fontSize: t.size.h3,
    letterSpacing: t.tracking.tight,
  },
  profileHandle: {
    fontFamily: t.weight.medium,
    fontSize: t.size.sm,
  },
  profileBio: {
    fontFamily: t.weight.regular,
    fontSize: t.size.xs,
    marginTop: 2,
  },
  editPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  editPillText: {
    fontFamily: t.weight.extrabold,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.eyebrow,
  },
  footer: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
    opacity: 0.5,
    gap: spacing.md,
  },
  footerLogo: {
    width: 96,
    height: 32,
  },
  versionText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: t.weight.bold,
    fontSize: t.size.h3,
  },
  sheetDone: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.body,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  langLabel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.body,
  },
  langDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
