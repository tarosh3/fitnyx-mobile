import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { user, loading: authLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const handleUpdatePassword = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => router.replace('/dashboard'), 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: palette.background, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={palette.primary} size="large" />
      </View>
    );
  }

  return (
    <Screen scroll={false} contentContainerStyle={styles.center}>
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.title, { color: palette.text }]}>Set New Password</Text>
        <Text style={[styles.subtitle, { color: palette.mutedText }]}>Enter your new password below.</Text>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
        />

        <Button title="Update Password" onPress={handleUpdatePassword} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    width: '100%',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'center',
  },
  success: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
