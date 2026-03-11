import { usePathname, useRouter } from 'expo-router';
import { Dumbbell, Home, LayoutGrid, Settings, Sparkles } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';

const hiddenRoutePrefixes = [
  '/onboarding',
  '/settings',
  '/profile',
  '/dashboard/stats',
  '/login',
  '/signup',
  '/workouts/customize',
  '/workouts/session',
  '/update-password',
  '/privacy-policy',
  '/terms-of-service',
  '/delete-account',
  '/email-verified',
  '/verification-failed',
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const palette = useThemeColors();
  const { user } = useAuth();
  const { openCenteredChat } = useAICoach();

  const styles = React.useMemo(() => getStyles(palette), [palette]);

  if (!user) return null;
  if (hiddenRoutePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null;

  const items = [
    {
      href: '/',
      icon: Home,
      active: pathname === '/',
    },
    {
      href: '/exercises',
      icon: Dumbbell,
      active: pathname.startsWith('/exercises'),
    },
    {
      href: '/dashboard',
      icon: LayoutGrid,
      active: pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
    },
    {
      href: '/settings',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <View style={styles.wrap}>
      <View style={[styles.container, { backgroundColor: `${palette.background}D9`, borderColor: `${palette.border}CC` }]}>
        {left.map((item) => (
          <NavItem key={item.href} item={item} onPress={() => router.push(item.href as never)} palette={palette} />
        ))}

        <View style={styles.centerSlot}>
          <Pressable onPress={openCenteredChat} style={({ pressed }) => [styles.aiButton, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Sparkles color="#FFFFFF" size={30} strokeWidth={2.5} />
          </Pressable>
        </View>

        {right.map((item) => (
          <NavItem key={item.href} item={item} onPress={() => router.push(item.href as never)} palette={palette} />
        ))}
      </View>
    </View>
  );
}

function NavItem({ item, onPress, palette }: { item: any; onPress: () => void; palette: any }) {
  const Icon = item.icon;
  const styles = React.useMemo(() => getStyles(palette), [palette]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Icon color={item.active ? palette.primary : palette.mutedText} size={25} strokeWidth={item.active ? 2.6 : 2.2} />
    </Pressable>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  wrap: {
    bottom: 4,
    left: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  container: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 72,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 54,
  },
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
    minWidth: 76,
  },
  aiButton: {
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderColor: palette.background,
    borderRadius: 999,
    borderWidth: 4,
    height: 68,
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    width: 68,
  },
});
