import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

import { PressableScale } from './PressableScale';

interface Props {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  destructive?: boolean;
  // either a switch, a chevron (onPress), or trailing custom node
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  onPress?: () => void;
  trailing?: React.ReactNode;
  showChevron?: boolean;
}

export function SettingRow({
  icon,
  label,
  description,
  value,
  destructive,
  switchValue,
  onSwitchChange,
  onPress,
  trailing,
  showChevron,
}: Props) {
  const c = useThemeColors();
  const isSwitch = typeof switchValue === 'boolean' && !!onSwitchChange;
  const labelColor = destructive ? c.destructive : c.text;

  const content = (
    <View style={styles.row}>
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: destructive ? `${c.destructive}1A` : `${c.primary}1A`,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}

      <View style={styles.text}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: c.mutedText }]}>{description}</Text>
        ) : null}
      </View>

      <View style={styles.trailingWrap}>
        {value ? (
          <Text style={[styles.value, { color: c.mutedText }]}>{value}</Text>
        ) : null}
        {isSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor="#fff"
          />
        ) : null}
        {trailing}
        {showChevron && !isSwitch ? (
          <ChevronRight size={18} color={c.mutedText} strokeWidth={2} />
        ) : null}
      </View>
    </View>
  );

  if (isSwitch || !onPress) {
    return <View style={styles.outer}>{content}</View>;
  }

  return (
    <PressableScale onPress={onPress} style={styles.outer}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: type.weight.semibold,
    fontSize: type.size.body,
  },
  description: {
    fontFamily: type.weight.regular,
    fontSize: type.size.xs,
  },
  value: {
    fontFamily: type.weight.medium,
    fontSize: type.size.sm,
  },
  trailingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
