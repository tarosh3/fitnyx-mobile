import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
}

export function AuthForm({ initialMode = 'login', onSuccess }: AuthFormProps) {
  const router = useRouter();
  const palette = useThemeColors();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const redirectTo = useMemo(
    () => makeRedirectUri({ scheme: 'fitnyxmobile', path: 'auth/callback' }),
    []
  );

  const handleAuth = async () => {
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
            emailRedirectTo: redirectTo,
          },
        });

        if (signUpError) throw signUpError;
        setConfirmation('Check your email to confirm account.');
      } else if (mode === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (resetError) throw resetError;
        setConfirmation('Check your email for the password reset link.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        router.replace('/dashboard');
        onSuccess?.();
      }
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase();
      if (message.includes('user already registered') || message.includes('email already') || err?.status === 422) {
        setError('Email address already exists. Please login instead.');
      } else if (message.includes('rate limit') || err?.status === 429) {
        setError('Too many attempts. Please wait before trying again.');
      } else if (message.includes('invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err?.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('No OAuth URL returned.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success' || !result.url) {
        setLoading(false);
        return;
      }

      const callbackUrl = new URL(result.url);
      const code = callbackUrl.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else {
        const hash = callbackUrl.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw setSessionError;
        }
      }

      router.replace('/dashboard');
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Social login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (confirmation) {
    return (
      <Card style={styles.confirmCard}>
        <Text style={[styles.confirmTitle, { color: palette.text }]}>Email Sent</Text>
        <Text style={[styles.confirmText, { color: palette.mutedText }]}>{confirmation}</Text>
        <Button
          title="Go to Login"
          onPress={() => {
            setConfirmation(null);
            setMode('login');
            setPassword('');
          }}
          style={styles.confirmBtn}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <Text style={[styles.brand, { color: palette.text }]}>FITNYX</Text>
      <Text style={[styles.subtitle, { color: palette.mutedText }]}> 
        {mode === 'login' ? 'Login to continue your progress' : mode === 'signup' ? 'Create your FitNyx account' : 'Recover your account'}
      </Text>

      {error && (
        <View style={[styles.errorBox, { borderColor: '#EF444444', backgroundColor: '#EF444422' }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {mode === 'signup' && (
        <View style={styles.row}>
          <Input value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
          <Input value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
        </View>
      )}

      <Input
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="operator@fitnyx.com"
      />

      {mode !== 'forgot_password' && (
        <View>
          <View style={[styles.passwordWrap, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <TextInput
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={palette.mutedText}
              autoCapitalize="none"
              style={[styles.passwordInput, { color: palette.text }]}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeBtn}>
              {showPassword ? <EyeOff color={palette.mutedText} size={16} /> : <Eye color={palette.mutedText} size={16} />}
            </Pressable>
          </View>
          {mode === 'login' && (
            <Text style={[styles.link, { color: palette.primary }]} onPress={() => setMode('forgot_password')}>
              Forgot Password?
            </Text>
          )}
        </View>
      )}

      <Button
        title={
          mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Recovery Link'
        }
        loading={loading}
        onPress={handleAuth}
      />

      {mode !== 'forgot_password' && (
        <View style={styles.socialWrap}>
          <Button title="Continue with Google" variant="secondary" onPress={() => handleSocialLogin('google')} />
          <Button title="Continue with Facebook" variant="secondary" onPress={() => handleSocialLogin('facebook')} />
        </View>
      )}

      <Text style={[styles.switchText, { color: palette.mutedText }]}> 
        {mode === 'login' ? "Don't have an account?" : mode === 'signup' ? 'Already have an account?' : 'Remember your password?'}{' '}
        <Text style={{ color: palette.primary }} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </Text>
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingVertical: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  passwordWrap: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingLeft: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  eyeBtn: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    minHeight: 36,
    width: 36,
  },
  link: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'right',
  },
  socialWrap: {
    gap: 10,
    marginTop: 6,
  },
  switchText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  confirmCard: {
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginTop: 20,
    paddingVertical: 30,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  confirmText: {
    fontSize: 14,
    textAlign: 'center',
  },
  confirmBtn: {
    marginTop: 10,
    minWidth: 200,
  },
});
