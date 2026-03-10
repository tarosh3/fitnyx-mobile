import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
  onSwitchMode?: (mode: 'login' | 'signup') => void;
}

export function AuthForm({ initialMode = 'login', onSuccess, onSwitchMode }: AuthFormProps) {
  const router = useRouter();
  const palette = useThemeColors();
  const styles = getStyles(palette);

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const formOpacity = useSharedValue(1);
  const formTranslateX = useSharedValue(0);

  const toggleMode = (newMode: 'login' | 'signup' | 'forgot_password') => {
    if (newMode === mode) return;

    // Animate out
    formOpacity.value = withTiming(0, { duration: 150 });
    formTranslateX.value = withTiming(-10, { duration: 150 });

    setTimeout(() => {
      setMode(newMode);
      if (newMode === 'login' || newMode === 'signup') {
        onSwitchMode?.(newMode);
      }

      // Prepare for animate in
      formTranslateX.value = 10;
      formOpacity.value = withTiming(1, { duration: 250 });
      formTranslateX.value = withTiming(0, { duration: 250 });
    }, 150);
  };

  const rFormStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateX: formTranslateX.value }],
  }));

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
      <View style={styles.confirmCard}>
        <Text style={[styles.confirmTitle, { color: '#FFFFFF' }]}>Email Sent</Text>
        <Text style={[styles.confirmText, { color: '#9CA3AF' }]}>{confirmation}</Text>
        <Button
          title="Go to Login"
          onPress={() => {
            setConfirmation(null);
            toggleMode('login');
            setPassword('');
          }}
          style={styles.confirmBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.formContainer}>
      {error && (
        <View style={[styles.errorBox, { borderColor: palette.destructive + '44' }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Animated.View style={[rFormStyle, { flex: 1, gap: 16 }]}>
        {mode === 'signup' && (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#4B5563"
                autoCapitalize="words"
                style={styles.premiumInput}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#4B5563"
                autoCapitalize="words"
                style={styles.premiumInput}
              />
            </View>
          </View>
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="email@example.com"
          placeholderTextColor="#4B5563"
          style={styles.premiumInput}
        />

        {mode !== 'forgot_password' && (
          <View>
            <View style={styles.passwordWrap}>
              <TextInput
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#4B5563"
                autoCapitalize="none"
                style={styles.passwordInput}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
              </Pressable>
            </View>
            {mode === 'login' && (
              <Pressable onPress={() => toggleMode('forgot_password')}>
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </Pressable>
            )}
          </View>
        )}

        <Button
          title={
            mode === 'login' ? 'LOG IN' : mode === 'signup' ? 'SIGN UP' : 'SEND RECOVERY LINK'
          }
          loading={loading}
          onPress={handleAuth}
          style={styles.primaryButton}
          textStyle={styles.primaryButtonText}
        />

        {mode !== 'forgot_password' && (
          <View style={styles.socialWrap}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}
              onPress={() => handleSocialLogin('google')}
            >
              <Text style={styles.socialText}>Continue with Google</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}
              onPress={() => handleSocialLogin('facebook')}
            >
              <Text style={styles.socialText}>Continue with Facebook</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.switchText}>
            {mode === 'login' ? "Don't have an account?" : mode === 'signup' ? 'Already have an account?' : 'Remember your password?'}{' '}
          </Text>
          <Pressable hitSlop={15} onPress={() => toggleMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.switchLink}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  formContainer: {
    flex: 1,
    gap: 16,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumInput: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    minHeight: 60,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordWrap: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    height: '100%',
  },
  eyeBtn: {
    padding: 8,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'right',
    color: '#5FC793',
  },
  primaryButton: {
    backgroundColor: '#5FC793',
    height: 60,
    borderRadius: 30,
    marginTop: 10,
    shadowColor: '#5FC793',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 16,
  },
  socialWrap: {
    marginTop: 10,
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
  },
  socialBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  switchText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  switchLink: {
    fontSize: 14,
    color: '#5FC793',
    fontWeight: '800',
  },
  confirmCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  confirmBtn: {
    width: '100%',
  },
});
