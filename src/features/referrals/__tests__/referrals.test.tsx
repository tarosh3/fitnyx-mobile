import React from 'react';
import { Share } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { canEnterCode, codeKind, friendLine, referralErrorMessage, sanitizeCode, shareMessage, sparksProgress } from '@/src/features/referrals/model';
import type { ReferralOverview } from '@/src/lib/api/referrals';

const mockGet = jest.fn();
const mockApply = jest.fn();
const mockRedeem = jest.fn();
const mockRefreshEntitlement = jest.fn(() => Promise.resolve());

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0, routes: [{ name: 'referrals' }] }) }),
  // useCachedResource refreshes on focus: run it once on mount.
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb, [cb]); },
}));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/src/components/ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/src/features/pro/store', () => ({ refreshEntitlement: () => mockRefreshEntitlement() }));
jest.mock('@/src/lib/api/referrals', () => ({
  getReferrals: () => mockGet(),
  applyReferralCode: (code: string) => mockApply(code),
  redeemSparks: () => mockRedeem(),
}));

const BASE: ReferralOverview = {
  code: 'K7M9P2Q', sparks: 3, sparks_per_reward: 30, reward_days: 7, active_days_needed: 10,
  can_enter_code: false, referred_by: null, friends: [], friends_total: 0,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await require('@/src/lib/cache').cacheClear?.().catch?.(() => undefined);
});

describe('model', () => {
  it('cleans and classifies codes', () => {
    expect(sanitizeCode(' k7m-9p2q ')).toBe('K7M9P2Q');
    expect(sanitizeCode('O0I1LU')).toBe('');
    expect(codeKind('K7M9P2Q')).toBe('referral');
    expect(codeKind('ABCDEF2345')).toBe('pro');
    expect(codeKind('ABC')).toBe('other');
  });
  it('offers code entry until a code is entered, with no deadline', () => {
    expect(canEnterCode({ can_enter_code: true, referred_by: null })).toBe(true);
    expect(canEnterCode({ can_enter_code: false, referred_by: null })).toBe(false);
    expect(canEnterCode({ can_enter_code: true, referred_by: { username: 'a', active_days: 0, qualified: false } })).toBe(false);
    // A backend from before can_enter_code: fall back to its deadline field.
    expect(canEnterCode({ enter_code_until: '2026-11-24T10:00:00Z', referred_by: null })).toBe(true);
    expect(canEnterCode({ enter_code_until: null, referred_by: null })).toBe(false);
  });
  it('shows progress to the next reward', () => {
    expect(sparksProgress({ sparks: 12, sparks_per_reward: 30 })).toEqual({ toward: 12, fraction: 0.4, left: 18, canRedeem: false });
    expect(sparksProgress({ sparks: 31, sparks_per_reward: 30 })).toMatchObject({ toward: 30, fraction: 1, left: 0, canRedeem: true });
  });
  it('words a friend and errors', () => {
    expect(friendLine({ active_days: 6, qualified: false }, 10)).toBe('6 of 10 active days');
    expect(friendLine({ active_days: 10, qualified: true }, 10)).toBe('Active · Spark earned');
    expect(referralErrorMessage({ status: 409, code: 'REFERRAL_ALREADY' })).toMatch(/already been referred/);
    expect(referralErrorMessage({ status: 429 })).toMatch(/Too many/);
    expect(referralErrorMessage(new Error('Network request failed'))).toMatch(/connection/);
    expect(shareMessage('K7M9P2Q')).toContain('K7M9P2Q');
  });
});

describe('ReferralsScreen', () => {
  const { ReferralsScreen } = require('@/src/features/referrals/ReferralsScreen');

  it('shows the code and Sparks; old users get no code field', async () => {
    mockGet.mockResolvedValue(BASE);
    render(<ReferralsScreen />);
    expect(await screen.findByTestId('referral-code')).toHaveTextContent('K7M9P2Q');
    expect(screen.getByText('27 more Sparks to unlock 7 days of Pro')).toBeOnTheScreen();
    expect(screen.queryByTestId('referral-enter')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('sparks-redeem')).not.toBeOnTheScreen();
    expect(screen.getByText('No one yet. Share your code and they\'ll show up here.')).toBeOnTheScreen();
  });

  it('a new user enters a friend\'s code; a Pro code is caught on the phone', async () => {
    mockGet.mockResolvedValueOnce({ ...BASE, can_enter_code: true })
      .mockResolvedValueOnce({ ...BASE, referred_by: { username: 'asha', active_days: 0, qualified: false } });
    mockApply.mockResolvedValue({ referred_by: { username: 'asha', active_days: 0, qualified: false } });
    render(<ReferralsScreen />);
    const field = await screen.findByTestId('referral-enter-input');

    fireEvent.changeText(field, 'ABCDEF2345');
    fireEvent.press(screen.getByTestId('referral-enter-submit'));
    expect(screen.getByText("That's a Pro code. Enter it under Get Pro → Pro code.")).toBeOnTheScreen();
    expect(mockApply).not.toHaveBeenCalled();

    fireEvent.changeText(field, 'asha-2x7');
    fireEvent.press(screen.getByTestId('referral-enter-submit'));
    await waitFor(() => expect(mockApply).toHaveBeenCalledWith('ASHA2X7'));
    expect(await screen.findByText('Referred by @asha')).toBeOnTheScreen();
  });

  it('shows the backend\'s reason when a code is refused', async () => {
    mockGet.mockResolvedValue({ ...BASE, can_enter_code: true });
    mockApply.mockRejectedValue(Object.assign(new Error('x'), { status: 400, code: 'REFERRAL_SELF' }));
    render(<ReferralsScreen />);
    fireEvent.changeText(await screen.findByTestId('referral-enter-input'), 'K7M9P2Q');
    fireEvent.press(screen.getByTestId('referral-enter-submit'));
    expect(await screen.findByText("That's your own code. Share it with friends instead.")).toBeOnTheScreen();
  });

  it('lists friends with their progress', async () => {
    mockGet.mockResolvedValue({
      ...BASE, friends_total: 2, friends: [
        { username: 'bo', active_days: 6, qualified: false, joined_at: '2026-11-01T00:00:00Z' },
        { username: 'cy', active_days: 10, qualified: true, joined_at: '2026-10-01T00:00:00Z' },
      ],
    });
    render(<ReferralsScreen />);
    expect(await screen.findByText('Friends you referred · 2')).toBeOnTheScreen();
    expect(screen.getByText('6 of 10 active days')).toBeOnTheScreen();
    expect(screen.getByText('Active · Spark earned')).toBeOnTheScreen();
  });

  it('redeems 30 Sparks after confirming and refreshes the plan', async () => {
    mockGet.mockResolvedValueOnce({ ...BASE, sparks: 30 }).mockResolvedValue({ ...BASE, sparks: 0 });
    mockRedeem.mockResolvedValue({ sparks: 0, pro_until: '2026-11-17T12:00:00Z', days: 7 });
    render(<ReferralsScreen />);
    fireEvent.press(await screen.findByTestId('sparks-redeem'));
    fireEvent.press(await screen.findByText('GET PRO'));
    await waitFor(() => expect(mockRedeem).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/7 days of Pro added\. Pro until 17 Nov\./)).toBeOnTheScreen();
    expect(mockRefreshEntitlement).toHaveBeenCalled();
  });

  it('a double tap on "Use this code" sends one request', async () => {
    mockGet.mockResolvedValue({ ...BASE, can_enter_code: true });
    let resolve!: (v: unknown) => void;
    mockApply.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<ReferralsScreen />);
    fireEvent.changeText(await screen.findByTestId('referral-enter-input'), 'K7M9P2Q');
    fireEvent.press(screen.getByTestId('referral-enter-submit'));
    fireEvent.press(screen.getByTestId('referral-enter-submit'));
    fireEvent(screen.getByTestId('referral-enter-input'), 'submitEditing');
    expect(mockApply).toHaveBeenCalledTimes(1);
    resolve({ referred_by: { username: 'asha', active_days: 0, qualified: false } });
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('a double tap on GET PRO redeems once', async () => {
    mockGet.mockResolvedValue({ ...BASE, sparks: 60 });
    let resolve!: (v: unknown) => void;
    mockRedeem.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<ReferralsScreen />);
    fireEvent.press(await screen.findByTestId('sparks-redeem'));
    const confirm = await screen.findByText('GET PRO');
    fireEvent.press(confirm);
    fireEvent.press(confirm);
    expect(mockRedeem).toHaveBeenCalledTimes(1);
    resolve({ sparks: 30, pro_until: '2026-11-17T12:00:00Z', days: 7 });
    expect(await screen.findByText(/7 days of Pro added/)).toBeOnTheScreen();
  });

  it('offline: applying or redeeming says so, and the saved copy still shows', async () => {
    mockGet.mockResolvedValueOnce({ ...BASE, sparks: 30, can_enter_code: true });
    const offline = Object.assign(new Error('Network request failed'), { name: 'NetworkUnavailableError' });
    mockApply.mockRejectedValue(offline);
    mockRedeem.mockRejectedValue(offline);
    render(<ReferralsScreen />);
    fireEvent.changeText(await screen.findByTestId('referral-enter-input'), 'K7M9P2Q');
    fireEvent.press(screen.getByTestId('referral-enter-submit'));
    expect(await screen.findByText("Couldn't reach FitNyx. Check your connection and try again.")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sparks-redeem'));
    fireEvent.press(await screen.findByText('GET PRO'));
    await waitFor(() => expect(screen.getAllByText("Couldn't reach FitNyx. Check your connection and try again.").length).toBe(2));
    expect(screen.getByTestId('referral-code')).toHaveTextContent('K7M9P2Q');
  });

  it('shares the actual invitation and recovers from an unavailable share sheet', async () => {
    mockGet.mockResolvedValue(BASE);
    const share = jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce({ action: Share.dismissedAction });
    render(<ReferralsScreen />);
    fireEvent.press(await screen.findByTestId('referral-share'));
    expect(await screen.findByText("Couldn't open sharing. Try again, or hold your code to copy it.")).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('referral-share'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2));
    expect(share).toHaveBeenLastCalledWith({ message: shareMessage(BASE.code) });
    share.mockRestore();
  });

  it('uses server-supplied reward thresholds throughout the journey', async () => {
    mockGet.mockResolvedValue({ ...BASE, sparks: 4, sparks_per_reward: 12, reward_days: 3, active_days_needed: 6 });
    render(<ReferralsScreen />);
    expect(await screen.findByText('8 more Sparks to unlock 3 days of Pro')).toBeOnTheScreen();
    expect(screen.getByText('From that day on, they finish a workout or a Roam on 6 different days.')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 12, now: 4 });
  });

  it('first load offline with nothing saved: Try again, not a blank screen', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network request failed')).mockResolvedValueOnce(BASE);
    render(<ReferralsScreen />);
    fireEvent.press(await screen.findByText('Try again'));
    expect(await screen.findByTestId('referral-code')).toBeOnTheScreen();
  });

  it('offers the code box with no deadline, and never once a code is entered', async () => {
    // An account from a year ago that nobody referred can still enter a code.
    mockGet.mockResolvedValueOnce({ ...BASE, can_enter_code: true });
    const { unmount } = render(<ReferralsScreen />);
    expect(await screen.findByTestId('referral-enter')).toBeOnTheScreen();
    expect(screen.queryByText(/14 days|Until /)).toBeNull();
    unmount();
    mockGet.mockResolvedValueOnce({ ...BASE, can_enter_code: false, referred_by: { username: 'friend', active_days: 2, qualified: false } });
    render(<ReferralsScreen />);
    expect(await screen.findByText(/friend/)).toBeOnTheScreen();
    expect(screen.queryByTestId('referral-enter')).toBeNull();
  });

  it('a second entry from a stale screen shows the server\'s reason', async () => {
    mockGet.mockResolvedValue({ ...BASE, can_enter_code: true });
    mockApply.mockRejectedValue(Object.assign(new Error('x'), { status: 409, code: 'REFERRAL_ALREADY' }));
    render(<ReferralsScreen />);
    fireEvent.changeText(await screen.findByTestId('referral-enter-input'), 'K7M9P2Q');
    fireEvent.press(screen.getByTestId('referral-enter-submit'));
    expect(await screen.findByText("You've already been referred.")).toBeOnTheScreen();
  });
});
