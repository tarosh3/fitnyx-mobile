import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BrandLoader } from '@/src/components/ui/BrandLoader';
import { loadRun, type RunState } from '@/src/features/cardio/store';
import { LiveScreen } from '@/src/features/cardio/ui/LiveScreen';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';

export default function CardioLiveRoute() {
  const c = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const [run, setRun] = useState<RunState | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRun(user.id).then((saved) => {
      if (saved) setRun(saved);
      else router.replace('/cardio');
    }).catch(() => router.replace('/cardio'));
  }, [user?.id]);

  if (!run || !user) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}><BrandLoader color={c.primary} size="large" /></View>;
  }
  return <LiveScreen userId={user.id} initial={run} />;
}
