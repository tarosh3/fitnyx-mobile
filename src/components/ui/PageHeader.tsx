import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  onBackPress?: () => void;
}

export function PageHeader({ title, subtitle, backTo, onBackPress }: PageHeaderProps) {
  const palette = useThemeColors();
  const router = useRouter();

  const goBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    const canGoBack = router.canGoBack();
    if (canGoBack) {
      router.back();
      return;
    }

    if (backTo) {
      router.replace(backTo as never);
      return;
    }

    router.replace('/dashboard');
  };

  return (
    <View style={[styles.wrap, { borderColor: palette.border }]}> 
      <Pressable
        onPress={goBack}
        style={[styles.back, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        <ChevronLeft color={palette.text} size={20} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: palette.mutedText }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 10,
  },
  back: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    width: 38,
  },
});
