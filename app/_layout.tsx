// Register notification background handler & foreground service at module level
import '@/src/lib/notificationBackgroundHandler';

import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

// Set native screen background to black to prevent white flash during transitions
enableScreens(true);

import * as SystemUI from 'expo-system-ui';

import { AICoachChat } from '@/src/components/ai/AICoachChat';
import { BackendKeepAlive } from '@/src/components/BackendKeepAlive';
import { ActiveSessionIndicator } from '@/src/components/navigation/ActiveSessionIndicator';
import { BottomNav } from '@/src/components/navigation/BottomNav';
import { SyncManager } from '@/src/components/SyncManager';
import { AICoachProvider } from '@/src/providers/AICoachProvider';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { QueryProvider } from '@/src/providers/QueryProvider';
import { ThemeProvider, useTheme } from '@/src/providers/ThemeProvider';
import { WorkoutProvider } from '@/src/providers/WorkoutProvider';

SplashScreen.preventAutoHideAsync();

function DynamicStatusBar() {
  const { theme } = useTheme();

  useEffect(() => {
    // Sync native window background with theme to prevent transition flashes
    const bgColor = theme === 'dark' ? '#0A0A0A' : '#F7F7F8';
    SystemUI.setBackgroundColorAsync(bgColor);
  }, [theme]);

  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} translucent={true} />;
}

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [loaded, error] = useFonts({
    Anton_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Splash screen hiding is now deferred to AuthProvider
      // to ensure app data and session are loaded first.
    }
  }, [loaded]);

  useEffect(() => {
    let currentCount = 0;

    const backAction = () => {
      // If we aren't on the root dashboard page, route there
      if (pathname !== '/' && pathname !== '/dashboard') {
        router.back();
        return true;
      }

      // If we are on the dashboard, require double tap to exit
      setTimeout(() => {
        currentCount = 0;
      }, 2000); // 2 seconds threshold

      if (currentCount === 0) {
        currentCount = 1;
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        return true; // prevent default behavior
      } else if (currentCount === 1) {
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [pathname, router]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider defaultTheme="dark" storageKey="fitnyx-theme">
            <WorkoutProvider>
              <AICoachProvider>
                <DynamicStatusBar />
                <BackendKeepAlive />
                <SyncManager />
                <ThemedStack />
                <BottomNav />
                <ActiveSessionIndicator />
                <AICoachChat />
              </AICoachProvider>
            </WorkoutProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

/** Reads current theme to set the Stack's native background dynamically */
function ThemedStack() {
  const { theme } = useTheme();
  const bg = theme === 'dark' ? '#0A0A0A' : '#F7F7F8';

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="dashboard/index" />
      <Stack.Screen name="exercises" />
      <Stack.Screen name="dashboard/stats" />
      <Stack.Screen name="dashboard/diet" />
      <Stack.Screen name="workouts/select" />
      <Stack.Screen name="workouts/customize" />
      <Stack.Screen name="workouts/history" />
      <Stack.Screen name="workouts/plans/[id]" />
      <Stack.Screen name="workouts/session/[id]" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="update-password" />
      <Stack.Screen name="email-verified" />
      <Stack.Screen name="verification-failed" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="terms-of-service" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
