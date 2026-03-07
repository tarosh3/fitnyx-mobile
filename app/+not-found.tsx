import React from 'react';
import { Text } from 'react-native';
import { Link } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function NotFoundScreen() {
  const palette = useThemeColors();

  return (
    <Screen scroll={false} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
      <Card style={{ alignItems: 'center', gap: 10, width: '100%' }}>
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>Screen Not Found</Text>
        <Text style={{ color: palette.mutedText, fontSize: 13, textAlign: 'center' }}>
          The screen you are trying to open does not exist.
        </Text>
        <Link href="/" asChild>
          <Button title="Go Home" />
        </Link>
      </Card>
    </Screen>
  );
}
