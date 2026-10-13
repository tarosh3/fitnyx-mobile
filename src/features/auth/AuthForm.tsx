import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react-native';
import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { oauthErrorFromParams, oauthErrorMessage } from '@/src/features/auth/oauthError';
import { exchangeCodeOnce } from '@/src/lib/authCode';
import { supabase } from '@/src/lib/supabase';
import { sanitizeName, sanitizeEmail, MAX_NAME, MAX_EMAIL, MAX_PASSWORD } from '@/src/lib/validators';
import { radii, spacing, type } from '@/src/styles/tokens';
import { colors } from '@/src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

// Signup confirmation links land on the website, which confirms the email on
// any device and hands off to the app on phones (fitnyx.in/email-confirmed).
// Opening the app's own scheme directly did nothing on a computer.
const EMAIL_CONFIRMED_URL = 'https://fitnyx.in/email-confirmed';

type AuthMode = 'login' | 'signup' | 'forgot_password';
type FieldName = 'firstName' | 'lastName' | 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;
type PendingAction = 'email' | 'google' | 'facebook' | null;

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
  onSuccess?: () => void;
  onSwitchMode?: (mode: 'login' | 'signup') => void;
  /** Informational banner shown above the form, including forced sign-out reasons. */
  notice?: string | null;
}

const palette = colors.dark;
const fieldBorder = '#626262';
const subtleBorder = '#343434';
const errorColor = '#FF9B9B';
const copy = {
  login: {
    title: 'Welcome back.',
    subtitle: 'Pick up where you left off.',
    action: 'Log in',
  },
  signup: {
    title: 'Build your better.',
    subtitle: 'A little stronger. A little healthier. Every day.',
    action: 'Create account',
  },
  forgot_password: {
    title: 'Reset your password.',
    subtitle: 'Enter your email and we’ll send you a reset link.',
    action: 'Send reset link',
  },
};

function authErrorMessage(error: unknown): string {
  const details = error as { message?: string; status?: number; code?: string };
  const message = String(details?.message || '').toLowerCase();
  if (message.includes('user already registered') || message.includes('email already') || details?.code === 'user_already_exists') {
    return 'There’s already an account with this email. Log in to continue.';
  }
  if (message.includes('rate limit') || details?.status === 429) {
    return 'Too many attempts. Wait a moment, then try again.';
  }
  if (message.includes('invalid login credentials')) {
    return 'That email and password don’t match. Try again or reset your password.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirm your email first. Check your inbox for the verification link.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'We couldn’t connect. Check your internet connection and try again.';
  }
  return details?.message || 'Something went wrong. Please try again.';
}

/** Brand marks are decorative; the containing buttons provide accessible names. */
function SocialMark({ provider }: { provider: 'google' | 'facebook' }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {provider === 'google' ? (
        <>
          <Path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
          <Path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.89.6-2.03.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
          <Path fill="#FBBC05" d="M6.4 13.92A6 6 0 0 1 6.09 12c0-.67.11-1.32.31-1.92V7.49H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.51l3.34-2.59Z" />
          <Path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.5l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59C7.19 7.72 9.4 5.96 12 5.96Z" />
        </>
      ) : (
        <Path fill="#6BA9FF" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.88v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
      )}
    </Svg>
  );
}

export interface AuthFormHandle {
  /** Steps back inside the form (reset or "check your inbox" → log in). False when there's nothing to step back to. */
  back: () => boolean;
}

export const AuthForm = forwardRef<AuthFormHandle, AuthFormProps>(function AuthForm(
  { initialMode = 'login', onSuccess, onSwitchMode, notice },
  ref,
) {
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackedFields = width < 360 || fontScale > 1.2;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmation, setConfirmation] = useState<'signup' | 'forgot_password' | null>(null);
  const busy = pending !== null;
  const pendingRef = useRef(false);
  const isMounted = useRef(true);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  React.useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const redirectTo = useMemo(
    () => makeRedirectUri({ scheme: 'fitnyxmobile', path: 'auth/callback' }),
    []
  );

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setError(null);
  };

  const toggleMode = (newMode: AuthMode) => {
    if (pendingRef.current) return;
    Keyboard.dismiss();
    setMode(newMode);
    setError(null);
    setFieldErrors({});
    setConfirmation(null);
    setPassword('');
    setShowPassword(false);
    setFocused(null);
    if (newMode === 'login' || newMode === 'signup') onSwitchMode?.(newMode);
  };

  useImperativeHandle(ref, () => ({
    back: () => {
      if (pendingRef.current) return true; // don't leave mid-request
      if (mode === 'forgot_password' || confirmation) {
        toggleMode('login');
        return true;
      }
      return false;
    },
  }));

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (mode === 'signup' && !firstName.trim()) nextErrors.firstName = 'Enter your first name.';
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (mode !== 'forgot_password' && !password) nextErrors.password = 'Enter your password.';
    else if (mode === 'signup' && password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    setFieldErrors(nextErrors);
    if (nextErrors.firstName) firstNameRef.current?.focus();
    else if (nextErrors.email) emailRef.current?.focus();
    else if (nextErrors.password) passwordRef.current?.focus();
    return Object.keys(nextErrors).length === 0;
  };

  const beginRequest = (action: Exclude<PendingAction, null>) => {
    pendingRef.current = true;
    setPending(action);
    setError(null);
    Keyboard.dismiss();
  };

  const endRequest = () => {
    pendingRef.current = false;
    if (isMounted.current) setPending(null);
  };

  const finishSignIn = () => {
    if (!isMounted.current) return;
    router.replace('/');
    onSuccess?.();
  };

  const handleAuth = async () => {
    if (pendingRef.current || !validate()) return;
    beginRequest('email');
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
            emailRedirectTo: EMAIL_CONFIRMED_URL,
          },
        });
        if (signUpError) throw signUpError;
        // Projects without email confirmation can create a session immediately.
        if (data.session) finishSignIn();
        else if (isMounted.current) setConfirmation('signup');
      } else if (mode === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (resetError) throw resetError;
        if (isMounted.current) setConfirmation('forgot_password');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        finishSignIn();
      }
    } catch (requestError: unknown) {
      if (isMounted.current) setError(authErrorMessage(requestError));
    } finally {
      endRequest();
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (pendingRef.current) return;
    beginRequest(provider);
    setFieldErrors({});
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('We couldn’t start sign in. Please try again.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) return;
      const callbackUrl = new URL(result.url);
      const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
      const callbackError = oauthErrorFromParams(callbackUrl.searchParams, hashParams);
      if (callbackError) throw new Error(oauthErrorMessage(callbackError));
      const code = callbackUrl.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await exchangeCodeOnce(code);
        if (exchangeError) throw exchangeError;
      } else {
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (!accessToken || !refreshToken) throw new Error('Sign in wasn’t completed. Please try again.');
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) throw sessionError;
      }
      finishSignIn();
    } catch (requestError: unknown) {
      if (isMounted.current) setError(authErrorMessage(requestError));
    } finally {
      endRequest();
    }
  };

  const inputStyle = (field: FieldName) => [
    styles.input,
    focused === field && styles.inputFocused,
    fieldErrors[field] && styles.inputInvalid,
  ];

  const fieldError = (field: FieldName) => fieldErrors[field] ? (
    <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{fieldErrors[field]}</Text>
  ) : null;

  if (confirmation) {
    return (
      <View style={styles.confirmation} testID="auth-confirmation">
        <View style={styles.confirmIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <MailCheck color={palette.primary} size={32} strokeWidth={1.6} />
        </View>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>Check your inbox.</Text>
          <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
            {confirmation === 'signup' ? 'We sent a confirmation link to' : 'If an account exists, a password reset link is on its way to'}
          </Text>
          <Text style={styles.confirmEmail}>{email}</Text>
        </View>
        <Text style={styles.confirmHelp}>
          {confirmation === 'signup' ? 'Open the link to verify your email, then come back to log in.' : 'Open the link in your email to choose a new password.'}
          {'\n\n'}Can’t find it? Check your spam or junk folder.
        </Text>
        <Pressable
          accessibilityRole="button"
          testID="auth-back-to-login"
          onPress={() => toggleMode('login')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Back to log in</Text>
          <ArrowRight color={palette.primaryText} size={19} />
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.textButton} onPress={() => toggleMode(confirmation)}>
          <Text style={styles.switchLink}>Use a different email</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.formContainer}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{copy[mode].title}</Text>
        <Text style={styles.subtitle}>{copy[mode].subtitle}</Text>
      </View>

      {notice && !error && (
        <View style={styles.noticeBox}>
          <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      <View style={styles.fields}>
        {mode === 'signup' && (
          <View style={[styles.row, stackedFields && styles.stackedRow]}>
            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                ref={firstNameRef}
                testID="auth-first-name"
                accessibilityLabel="First name"
                accessibilityHint={fieldErrors.firstName}
                value={firstName}
                onChangeText={(value) => { setFirstName(sanitizeName(value)); clearFieldError('firstName'); }}
                onFocus={() => setFocused('firstName')}
                onBlur={() => setFocused(null)}
                placeholder="First name"
                placeholderTextColor={palette.mutedText}
                autoCapitalize="words"
                autoComplete="given-name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => lastNameRef.current?.focus()}
                maxLength={MAX_NAME}
                editable={!busy}
                selectionColor={palette.primary}
                style={inputStyle('firstName')}
              />
              {fieldError('firstName')}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Last name <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                ref={lastNameRef}
                testID="auth-last-name"
                accessibilityLabel="Last name, optional"
                value={lastName}
                onChangeText={(value) => setLastName(sanitizeName(value))}
                onFocus={() => setFocused('lastName')}
                onBlur={() => setFocused(null)}
                placeholder="Last name"
                placeholderTextColor={palette.mutedText}
                autoCapitalize="words"
                autoComplete="family-name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
                maxLength={MAX_NAME}
                editable={!busy}
                selectionColor={palette.primary}
                style={inputStyle('lastName')}
              />
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            ref={emailRef}
            testID="auth-email"
            accessibilityLabel="Email address"
            accessibilityHint={fieldErrors.email}
            value={email}
            onChangeText={(value) => { setEmail(sanitizeEmail(value)); clearFieldError('email'); }}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType={mode === 'forgot_password' ? 'send' : 'next'}
            submitBehavior={mode === 'forgot_password' ? 'blurAndSubmit' : 'submit'}
            onSubmitEditing={() => mode === 'forgot_password' ? handleAuth() : passwordRef.current?.focus()}
            placeholder="you@example.com"
            placeholderTextColor={palette.mutedText}
            maxLength={MAX_EMAIL}
            editable={!busy}
            selectionColor={palette.primary}
            style={inputStyle('email')}
          />
          {fieldError('email')}
        </View>

        {mode !== 'forgot_password' && (
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordWrap, focused === 'password' && styles.inputFocused, fieldErrors.password && styles.inputInvalid]}>
              <TextInput
                ref={passwordRef}
                testID="auth-password"
                accessibilityLabel="Password"
                accessibilityHint={fieldErrors.password || (mode === 'signup' ? 'Use at least 8 characters.' : undefined)}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(value) => { setPassword(value); clearFieldError('password'); }}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                placeholderTextColor={palette.mutedText}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                importantForAutofill="yes"
                returnKeyType="done"
                onSubmitEditing={handleAuth}
                maxLength={MAX_PASSWORD}
                editable={!busy}
                selectionColor={palette.primary}
                style={styles.passwordInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => setShowPassword((previous) => !previous)}
                style={styles.eyeButton}
              >
                {showPassword ? <EyeOff color={palette.mutedText} size={20} /> : <Eye color={palette.mutedText} size={20} />}
              </Pressable>
            </View>
            {fieldError('password')}
            {mode === 'signup' && !fieldErrors.password && <Text style={styles.helper}>Use at least 8 characters.</Text>}
            {mode === 'login' && (
              <Pressable
                testID="auth-forgot-password"
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => toggleMode('forgot_password')}
                style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable
        testID="auth-submit"
        accessibilityRole="button"
        accessibilityLabel={copy[mode].action}
        accessibilityState={{ disabled: busy, busy: pending === 'email' }}
        disabled={busy}
        onPress={handleAuth}
        style={({ pressed }) => [styles.primaryButton, busy && styles.disabled, pressed && styles.pressed]}
      >
        {pending === 'email' ? (
          <ActivityIndicator color={palette.primaryText} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>{copy[mode].action}</Text>
            <ArrowRight color={palette.primaryText} size={19} />
          </>
        )}
      </Pressable>

      {mode !== 'forgot_password' && (
        <View style={styles.socialWrap}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={[styles.row, stackedFields && styles.stackedRow]}>
            {(['google', 'facebook'] as const).map((provider) => (
              <Pressable
                key={provider}
                testID={`auth-${provider}`}
                accessibilityRole="button"
                accessibilityLabel={`Continue with ${provider === 'google' ? 'Google' : 'Facebook'}`}
                accessibilityState={{ disabled: busy, busy: pending === provider }}
                disabled={busy}
                style={({ pressed }) => [styles.socialButton, busy && styles.disabled, pressed && styles.pressed]}
                onPress={() => handleSocialLogin(provider)}
              >
                {pending === provider ? <ActivityIndicator color={palette.text} /> : <SocialMark provider={provider} />}
                <Text style={styles.socialText}>{provider === 'google' ? 'Google' : 'Facebook'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.switchText}>
          {mode === 'login' ? 'New to FitNyx?' : mode === 'signup' ? 'Already have an account?' : 'Remember your password?'}
        </Text>
        <Pressable
          testID="auth-switch-mode"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => toggleMode(mode === 'login' ? 'signup' : 'login')}
          style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
        >
          <Text style={styles.switchLink}>{mode === 'login' ? 'Sign up' : 'Log in'}</Text>
        </Pressable>
      </View>

      {mode !== 'forgot_password' && (
        <View style={styles.legal}>
          <Text style={styles.legalText}>By continuing, you agree to our</Text>
          <View style={styles.legalLinks}>
            <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.push('/terms-of-service')} style={styles.legalButton}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </Pressable>
            <Text style={styles.legalText}>and</Text>
            <Pressable accessibilityRole="link" disabled={busy} onPress={() => router.push('/privacy-policy')} style={styles.legalButton}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  formContainer: { gap: spacing.xl },
  heading: { gap: spacing.md },
  title: {
    color: palette.text,
    fontFamily: type.weight.bold,
    fontSize: type.size.h1,
    lineHeight: 39,
    letterSpacing: -1,
  },
  subtitle: {
    color: palette.mutedText,
    fontFamily: type.weight.regular,
    fontSize: type.size.sm,
    lineHeight: 22,
  },
  fields: { gap: spacing.lg, marginTop: spacing.sm },
  field: { flex: 1, gap: spacing.sm, minWidth: 0 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stackedRow: { flexDirection: 'column', alignItems: 'stretch' },
  label: { fontFamily: type.weight.medium, fontSize: type.size.sm, lineHeight: 20, color: palette.text },
  optional: { fontFamily: type.weight.regular, color: palette.mutedText, fontSize: type.size.xs },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: fieldBorder,
    borderRadius: radii.md,
    color: palette.text,
    fontFamily: type.weight.regular,
    fontSize: type.size.body,
    minHeight: 56,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  inputFocused: { borderColor: palette.primary },
  inputInvalid: { borderColor: errorColor },
  passwordWrap: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: fieldBorder,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingLeft: spacing.base,
    paddingRight: spacing.xs,
    paddingVertical: spacing.base,
    color: palette.text,
    fontFamily: type.weight.regular,
    fontSize: type.size.body,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  eyeButton: { minWidth: 52, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  fieldError: { color: errorColor, fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
  helper: { color: palette.mutedText, fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
  forgotButton: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center', marginTop: -spacing.xs, marginBottom: -spacing.md },
  forgotLink: { color: palette.primary, fontFamily: type.weight.semibold, fontSize: type.size.sm, lineHeight: 20 },
  primaryButton: {
    minHeight: 56,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  primaryButtonText: { color: palette.primaryText, fontFamily: type.weight.bold, fontSize: type.size.body, lineHeight: 24 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.65 },
  errorBox: { borderRadius: radii.md, backgroundColor: '#271819', borderColor: '#6B3639', borderWidth: 1, padding: spacing.base },
  errorText: { color: errorColor, fontFamily: type.weight.medium, fontSize: type.size.sm, lineHeight: 21 },
  noticeBox: { borderRadius: radii.md, backgroundColor: palette.surface, borderColor: subtleBorder, borderWidth: 1, padding: spacing.base },
  noticeText: { color: palette.text, fontFamily: type.weight.regular, fontSize: type.size.sm, lineHeight: 21 },
  socialWrap: { gap: spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: subtleBorder },
  dividerText: { color: palette.mutedText, fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18 },
  socialButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: subtleBorder,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
  },
  socialText: { color: palette.text, fontFamily: type.weight.semibold, fontSize: type.size.sm, lineHeight: 20, flexShrink: 1 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: spacing.sm, marginTop: -spacing.sm },
  switchText: { color: palette.mutedText, fontFamily: type.weight.regular, fontSize: type.size.sm, lineHeight: 22 },
  switchButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
  switchLink: { color: palette.primary, fontFamily: type.weight.semibold, fontSize: type.size.sm, lineHeight: 22 },
  legal: { alignItems: 'center', marginTop: -spacing.md },
  legalText: { color: palette.mutedText, fontFamily: type.weight.regular, fontSize: type.size.xs, lineHeight: 18, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: spacing.xs },
  legalButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
  legalLink: { color: palette.mutedText, fontFamily: type.weight.medium, fontSize: type.size.xs, lineHeight: 18, textDecorationLine: 'underline' },
  confirmation: { gap: spacing.xl, paddingTop: spacing.xl },
  confirmIcon: { height: 72, width: 72, borderRadius: radii.xl, backgroundColor: '#15241D', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  confirmEmail: { color: palette.text, fontFamily: type.weight.semibold, fontSize: type.size.body, lineHeight: 24 },
  confirmHelp: { color: palette.mutedText, fontFamily: type.weight.regular, fontSize: type.size.sm, lineHeight: 22 },
  textButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
