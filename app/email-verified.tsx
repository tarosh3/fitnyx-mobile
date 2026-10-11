import { useRouter } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import React from 'react';

import { AuthResultCard } from '@/src/features/auth/components/AuthResultCard';

export default function EmailVerifiedScreen() {
  const router = useRouter();
  return (
    <AuthResultCard
      icon={MailCheck}
      tone="success"
      title="Email verified"
      body="Your account is ready. Log in to start training."
      actionLabel="Log in"
      onAction={() => router.replace('/login')}
    />
  );
}
