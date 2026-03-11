import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import { Screen } from '@/src/components/ui/Screen';
import { AuthForm } from '@/src/features/auth/AuthForm';
import { useAuth } from '@/src/providers/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

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
      <AuthForm initialMode="login" onSuccess={() => router.replace('/dashboard')} />
    </Screen>
  );
}
