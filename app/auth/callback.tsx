import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { supabase } from '@/src/lib/supabase';

/**
 * Handles deep-link callbacks from Supabase Auth:
 *   - Email verification (type=signup)
 *   - Password reset (type=recovery)
 *   - Magic link login (type=magiclink)
 *
 * PKCE flow sends a `code` query param to exchange for a session.
 * Implicit flow sends tokens in the URL hash fragment.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Expo Router passes query params when navigating via deep link (warm start)
  const searchParams = useLocalSearchParams<{ code?: string; type?: string }>();

  useEffect(() => {
    const handleCallback = async () => {
      if (handled.current) return;
      handled.current = true;

      try {
        // Warm start: Expo Router already parsed the deep link into searchParams.
        // Cold start: getInitialURL() returns the full URL that launched the app.
        let code = searchParams.code;
        let type = searchParams.type;
        let rawUrl: string | null = null;

        if (!code) {
          rawUrl = await Linking.getInitialURL();
          if (rawUrl) {
            const parsed = Linking.parse(rawUrl);
            const qp = parsed.queryParams ?? {};
            code = qp.code as string | undefined;
            type = type || (qp.type as string | undefined);
          }
        }

        // PKCE flow: exchange authorization code for session
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (rawUrl) {
          // Implicit flow fallback: extract tokens from hash fragment
          const hashIndex = rawUrl.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = new URLSearchParams(rawUrl.substring(hashIndex + 1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionError) throw sessionError;
            } else {
              setError('Invalid callback link. Please try again.');
              return;
            }
          } else {
            setError('Invalid callback link. Please try again.');
            return;
          }
        } else {
          setError('No callback URL received.');
          return;
        }

        // Route based on the auth event type
        switch (type) {
          case 'recovery':
            router.replace('/update-password');
            break;
          case 'signup':
          case 'email':
            router.replace('/email-verified');
            break;
          case 'magiclink':
            router.replace('/dashboard');
            break;
          default:
            router.replace('/dashboard');
            break;
        }
      } catch (err: any) {
        const message = err?.message ?? 'Verification failed';

        if (
          message.includes('expired') ||
          message.includes('invalid') ||
          message.includes('already been used')
        ) {
          router.replace('/verification-failed');
        } else {
          setError(message);
        }
      }
    };

    handleCallback();
  }, [router, searchParams.code, searchParams.type]);

  if (error) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.center}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.text }]}>Something went wrong</Text>
          <Text style={[styles.subtitle, { color: palette.mutedText }]}>{error}</Text>
          <Button title="Back to Login" onPress={() => router.replace('/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentContainerStyle={styles.center}>
      <ActivityIndicator size="large" color={palette.primary} />
      <Text style={[styles.loadingText, { color: palette.mutedText }]}>Verifying...</Text>
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
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 15,
    marginTop: 16,
  },
});
