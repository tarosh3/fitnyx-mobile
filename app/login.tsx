import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import { Screen } from '@/src/components/ui/Screen';
import { AuthForm } from '@/src/features/auth/AuthForm';
import { useAuth } from '@/src/providers/AuthProvider';

// Reasons set by the global auth-failure handler when it redirects here.
const NOTICE_BY_REASON: Record<string, string> = {
  session_revoked: 'You were signed out because your account was used on another device.',
  expired: 'Your session expired. Please sign in again.',
};

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const notice = reason ? NOTICE_BY_REASON[reason] ?? null : null;

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  return (
    <Screen
      scroll={false}
      style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, backgroundColor: '#000000' }}
      contentContainerStyle={{ flex: 1, backgroundColor: '#000000' }}
    >
      <AuthForm initialMode="login" notice={notice} onSuccess={() => router.replace('/dashboard')} />
    </Screen>
  );
}
