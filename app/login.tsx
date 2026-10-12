import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import { AuthScreen } from '@/src/features/auth/AuthScreen';
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
      router.replace('/');
    }
  }, [loading, user, router]);

  return <AuthScreen mode="login" notice={notice} />;
}
