import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/src/lib/supabase';
import { AuthForm, type AuthFormHandle } from '../AuthForm';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const callbackUrl = 'fitnyxmobile://auth/callback';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));
jest.mock('expo-auth-session', () => ({ makeRedirectUri: () => 'fitnyxmobile://auth/callback' }));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

const auth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const browserSession = WebBrowser.openAuthSessionAsync as jest.Mock;

function enterLogin() {
  fireEvent.changeText(screen.getByTestId('auth-email'), 'test@example.com');
  fireEvent.changeText(screen.getByTestId('auth-password'), 'password123');
}

beforeEach(() => {
  jest.clearAllMocks();
  (auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
  (auth.signUp as jest.Mock).mockResolvedValue({ data: { session: null }, error: null });
  (auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });
  (auth.signInWithOAuth as jest.Mock).mockResolvedValue({ data: { url: 'https://provider.example/signin' }, error: null });
  (auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({ error: null });
  (auth.setSession as jest.Mock).mockResolvedValue({ error: null });
});

describe('AuthForm', () => {
  it('shows actionable validation and never submits incomplete credentials', () => {
    render(<AuthForm />);
    fireEvent.press(screen.getByTestId('auth-submit'));
    expect(screen.getByText('Enter your email address.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('auth-email'), 'invalid-email');
    fireEvent.press(screen.getByTestId('auth-submit'));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('validates signup, preserves optional last names and shows email confirmation', async () => {
    render(<AuthForm initialMode="signup" />);
    enterLogin();
    fireEvent.changeText(screen.getByTestId('auth-password'), 'short');
    fireEvent.press(screen.getByTestId('auth-submit'));
    expect(screen.getByText('Enter your first name.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('auth-first-name'), ' Sam ');
    fireEvent.changeText(screen.getByTestId('auth-password'), 'password123');
    fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-confirmation')).toBeTruthy());
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com', password: 'password123',
      options: { data: { first_name: 'Sam', last_name: '' }, emailRedirectTo: 'https://fitnyx.in/email-confirmed' },
    });
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('auth-back-to-login'));
    expect(screen.getByText('Welcome back.')).toBeTruthy();
    expect(screen.getByTestId('auth-email').props.value).toBe('test@example.com');
  });

  it('clears stale field errors and passwords when switching modes', () => {
    const onSwitchMode = jest.fn();
    render(<AuthForm onSwitchMode={onSwitchMode} />);
    fireEvent.changeText(screen.getByTestId('auth-password'), 'old-password');
    fireEvent.press(screen.getByTestId('auth-submit'));
    fireEvent.press(screen.getByTestId('auth-switch-mode'));
    expect(screen.queryByText('Enter your email address.')).toBeNull();
    expect(screen.getByTestId('auth-password').props.value).toBe('');
    expect(onSwitchMode).toHaveBeenCalledWith('signup');
  });

  it('uses email-only recovery and lets the user correct the destination', async () => {
    render(<AuthForm />);
    fireEvent.changeText(screen.getByTestId('auth-email'), 'test@example.com');
    fireEvent.press(screen.getByTestId('auth-forgot-password'));
    expect(screen.getByText('Reset your password.')).toBeTruthy();
    expect(screen.queryByTestId('auth-password')).toBeNull();
    expect(screen.queryByTestId('auth-google')).toBeNull();
    fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByText('Check your inbox.')).toBeTruthy());
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', { redirectTo: callbackUrl });
    fireEvent.press(screen.getByText('Use a different email'));
    expect(screen.getByText('Reset your password.')).toBeTruthy();
    expect(screen.getByTestId('auth-email').props.value).toBe('test@example.com');
  });

  it('blocks duplicate submissions, alternate auth and mode switches during a request', async () => {
    let finishRequest: (value: unknown) => void = () => {};
    (auth.signInWithPassword as jest.Mock).mockImplementation(() => new Promise((resolve) => { finishRequest = resolve; }));
    render(<AuthForm />);
    enterLogin();
    fireEvent.press(screen.getByTestId('auth-submit'));
    fireEvent.press(screen.getByTestId('auth-submit'));
    fireEvent.press(screen.getByTestId('auth-google'));
    fireEvent.press(screen.getByTestId('auth-switch-mode'));
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(screen.getByText('Welcome back.')).toBeTruthy();
    expect(screen.getByTestId('auth-email').props.editable).toBe(false);
    await act(async () => finishRequest({ error: null }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('explains failed login and removes its error when changing modes', async () => {
    (auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<AuthForm />);
    enterLogin();
    fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByText('That email and password don’t match. Try again or reset your password.')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('auth-forgot-password'));
    expect(screen.queryByText('That email and password don’t match. Try again or reset your password.')).toBeNull();
  });

  it('offers accessible password visibility controls', () => {
    render(<AuthForm />);
    expect(screen.getByTestId('auth-password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByTestId('auth-password').props.secureTextEntry).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByTestId('auth-password').props.secureTextEntry).toBe(true);
  });

  it('does not navigate when the OAuth browser is cancelled', async () => {
    browserSession.mockResolvedValue({ type: 'cancel' });
    render(<AuthForm />);
    fireEvent.press(screen.getByTestId('auth-google'));
    await waitFor(() => expect(screen.getByTestId('auth-submit')).not.toBeDisabled());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('rejects OAuth success callbacks that contain no session credentials', async () => {
    browserSession.mockResolvedValue({ type: 'success', url: callbackUrl });
    render(<AuthForm />);
    fireEvent.press(screen.getByTestId('auth-facebook'));
    await waitFor(() => expect(screen.getByText('Sign in wasn’t completed. Please try again.')).toBeTruthy());
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('exchanges an OAuth authorization code before navigating', async () => {
    const onSuccess = jest.fn();
    browserSession.mockResolvedValue({ type: 'success', url: `${callbackUrl}?code=example-code` });
    render(<AuthForm onSuccess={onSuccess} />);
    fireEvent.press(screen.getByTestId('auth-google'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('example-code');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('supports the implicit OAuth token callback', async () => {
    browserSession.mockResolvedValue({ type: 'success', url: `${callbackUrl}#access_token=access&refresh_token=refresh` });
    render(<AuthForm />);
    fireEvent.press(screen.getByTestId('auth-facebook'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  });

  it('shows provider callback failures instead of navigating', async () => {
    browserSession.mockResolvedValue({ type: 'success', url: `${callbackUrl}?error=access_denied&error_description=Permission+was+denied` });
    render(<AuthForm />);
    fireEvent.press(screen.getByTestId('auth-google'));
    await waitFor(() => expect(screen.getByText('Permission was denied')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('steps back from reset password to log in before leaving the screen', () => {
    const ref = React.createRef<AuthFormHandle>();
    render(<AuthForm ref={ref} />);
    expect(ref.current?.back()).toBe(false); // already on log in: let the screen go back

    fireEvent.press(screen.getByTestId('auth-forgot-password'));
    expect(screen.getByText('Reset your password.')).toBeTruthy();
    act(() => {
      expect(ref.current?.back()).toBe(true);
    });
    expect(screen.getByText('Welcome back.')).toBeTruthy();
  });
});
