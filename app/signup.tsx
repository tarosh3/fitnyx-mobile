import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { AuthForm } from '@/src/features/auth/AuthForm';
import { useAuth } from '@/src/providers/AuthProvider';

export default function SignupScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  return (
    <Screen scroll={false} contentContainerStyle={{ justifyContent: 'center' }}>
      <AuthForm initialMode="signup" onSuccess={() => router.replace('/dashboard')} />
    </Screen>
  );
}
