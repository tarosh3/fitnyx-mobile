import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import { AuthScreen } from '@/src/features/auth/AuthScreen';
import { useAuth } from '@/src/providers/AuthProvider';

export default function SignupScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  return <AuthScreen mode="signup" />;
}
