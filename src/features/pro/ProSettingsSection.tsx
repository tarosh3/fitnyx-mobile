import { useRouter } from 'expo-router';
import { Gift, Ticket } from 'lucide-react-native';
import { ProIcon } from '@/src/features/pro/ProIcon';
import React from 'react';

import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { SettingGroup } from '@/src/components/ui/SettingGroup';
import { SettingRow } from '@/src/components/ui/SettingRow';
import { planLine } from '@/src/features/pro/model';
import { ProTag } from '@/src/features/pro/ProTag';
import { useEntitlement } from '@/src/features/pro/store';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Settings → Plan: the user's plan (opens Get Pro), the Pro-code field and Refer friends. */
export function ProSettingsSection() {
  const c = useThemeColors();
  const router = useRouter();
  const { isPro, entitlement } = useEntitlement();
  return (
    <>
      <SectionHeader eyebrow="Plan" />
      <SettingGroup>
        <SettingRow
          icon={<ProIcon size={20} color={c.accent} />}
          label="FitNyx Pro"
          description={isPro ? planLine(entitlement) : 'Free plan · see what Pro adds'}
          trailing={isPro ? <ProTag /> : undefined}
          onPress={() => router.push('/pro')}
          showChevron
        />
        <SettingRow
          icon={<Ticket size={20} color={c.accent} />}
          label="Pro code"
          description="Have a Pro code? Redeem it for Pro"
          onPress={() => router.push({ pathname: '/pro', params: { redeem: '1' } })}
          showChevron
        />
        <SettingRow
          icon={<Gift size={20} color={c.accent} />}
          label="Refer friends"
          description="Earn Sparks · 30 Sparks = 7 days of Pro"
          onPress={() => router.push('/referrals')}
          showChevron
        />
      </SettingGroup>
    </>
  );
}
