import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { AICoachChat } from '@/src/components/ai/AICoachChat';
import { BackendKeepAlive } from '@/src/components/BackendKeepAlive';
import { ActiveSessionIndicator } from '@/src/components/navigation/ActiveSessionIndicator';
import { BottomNav } from '@/src/components/navigation/BottomNav';
import { SyncManager } from '@/src/components/SyncManager';
import { AICoachProvider } from '@/src/providers/AICoachProvider';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { ThemeProvider } from '@/src/providers/ThemeProvider';
import { WorkoutProvider } from '@/src/providers/WorkoutProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="fitnyx-theme">
        <WorkoutProvider>
          <AICoachProvider>
            <StatusBar style="light" />
            <BackendKeepAlive />
            <SyncManager />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
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
              <Stack.Screen name="update-password" />
              <Stack.Screen name="email-verified" />
              <Stack.Screen name="verification-failed" />
              <Stack.Screen name="privacy-policy" />
              <Stack.Screen name="terms-of-service" />
              <Stack.Screen name="delete-account" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <BottomNav />
            <ActiveSessionIndicator />
            <AICoachChat />
          </AICoachProvider>
        </WorkoutProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
