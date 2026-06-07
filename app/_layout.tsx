// Register notification background handler & foreground service at module level
import '@/src/lib/notificationBackgroundHandler';

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const APP_VERSION = (Constants.expoConfig?.version ?? '0.0.0') as string;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: `fitnyx-mobile@${APP_VERSION}`,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_ENABLE_DEV === 'true',
    tracesSampleRate: 0.2,
    attachStacktrace: true,
    enableNative: true,
    enableAutoSessionTracking: true,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      const err = hint?.originalException as Error | undefined;
      const msg = err?.message ?? '';
      if (msg.includes('Refresh Token Not Found')) return null;
      if (msg.includes('Network request failed')) return null;
      if (msg.includes('AbortError')) return null;
      return event;
    },
  });
}

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
import { AppState, BackHandler, LogBox, ToastAndroid, View, StyleSheet } from 'react-native';

LogBox.ignoreLogs([
  'AuthApiError: Invalid Refresh Token',
  'Invalid Refresh Token: Refresh Token Not Found',
  'Refresh Token Not Found',
]);

import { rescheduleAll as rescheduleAllReminders } from '@/src/lib/reminders';
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
import AnimatedSplash from '@/src/screens/SplashScreen';

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

function RootLayout() {
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

  const [showAnimated, setShowAnimated] = React.useState(true);

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const onLayoutRootView = React.useCallback(async () => {
    if (loaded) {
      // Hide the NATIVE splash as soon as the root view mounts
      await SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    let currentCount = 0;

    const backAction = () => {
      // If we aren't on the root dashboard page, go back or navigate to dashboard
      if (pathname !== '/' && pathname !== '/dashboard') {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/dashboard');
        }
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

  useEffect(() => {
    rescheduleAllReminders().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') rescheduleAllReminders().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider defaultTheme="dark" storageKey="fitnyx-theme">
            <WorkoutProvider>
              <AICoachProvider>
                <View style={{ flex: 1 }}>
                  <ThemedStack />
                  
                  {showAnimated && (
                    <View style={StyleSheet.absoluteFill}>
                      <AnimatedSplash
                        onAnimationComplete={() => setShowAnimated(false)}
                      />
                    </View>
                  )}

                  {!showAnimated && (
                    <>
                      <DynamicStatusBar />
                      <BackendKeepAlive />
                      <SyncManager />
                      <BottomNav />
                      <ActiveSessionIndicator />
                      <AICoachChat />
                    </>
                  )}
                </View>
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
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true, contentStyle: { backgroundColor: bg } }}>
      <Stack.Screen name="index" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="signup" options={{ gestureEnabled: false }} />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="dashboard/index" options={{ animation: 'fade' }} />
      <Stack.Screen name="exercises" options={{ animation: 'fade' }} />
      <Stack.Screen name="dashboard/stats" options={{ animation: 'fade' }} />
      <Stack.Screen name="dashboard/diet" />
      <Stack.Screen name="workouts/select" />
      <Stack.Screen name="workouts/customize" />
      <Stack.Screen name="workouts/history" />
      <Stack.Screen name="workouts/plans/[id]" />
      <Stack.Screen name="workouts/session/[id]" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" options={{ animation: 'fade' }} />
      <Stack.Screen name="settings/coach-memory" />
      <Stack.Screen name="reminders" />
      <Stack.Screen name="water" />
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

export default Sentry.wrap(RootLayout);
