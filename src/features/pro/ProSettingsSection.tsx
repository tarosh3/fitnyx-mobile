import { useRouter } from 'expo-router';
import { Crown, Ticket } from 'lucide-react-native';
import React from 'react';

import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { SettingGroup } from '@/src/components/ui/SettingGroup';
import { SettingRow } from '@/src/components/ui/SettingRow';
import { planLine } from '@/src/features/pro/model';
import { ProTag } from '@/src/features/pro/ProTag';
import { useEntitlement } from '@/src/features/pro/store';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Settings → Plan: the user's plan (opens Get Pro) and the invite-code field. */
export function ProSettingsSection() {
  const c = useThemeColors();
  const router = useRouter();
  const { isPro, entitlement } = useEntitlement();
  return (
    <>
      <SectionHeader eyebrow="Plan" />
      <SettingGroup>
        <SettingRow
          icon={<Crown size={20} color={c.accent} strokeWidth={1.8} />}
          label="FitNyx Pro"
          description={isPro ? planLine(entitlement) : 'Free plan · see what Pro adds'}
          trailing={isPro ? <ProTag /> : undefined}
          onPress={() => router.push('/pro')}
          showChevron
        />
        <SettingRow
          icon={<Ticket size={20} color={c.accent} strokeWidth={1.8} />}
          label="Invite code"
          description="Have a code? Redeem it for Pro"
          onPress={() => router.push({ pathname: '/pro', params: { redeem: '1' } })}
          showChevron
        />
      </SettingGroup>
    </>
  );
}
