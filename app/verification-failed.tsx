import { useRouter } from 'expo-router';
import { MailX } from 'lucide-react-native';
import React from 'react';

import { AuthResultCard } from '@/src/features/auth/components/AuthResultCard';

export default function VerificationFailedScreen() {
  const router = useRouter();
  return (
    <AuthResultCard
      icon={MailX}
      tone="error"
      title="Link expired"
      body="This link has already been used or has expired. Log in — or sign up again with the same email to get a new link."
      actionLabel="Back to log in"
      onAction={() => router.replace('/login')}
    />
  );
}
