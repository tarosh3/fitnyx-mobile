import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { photoErrorKind } from '@/src/features/diet/photo/model';
import { cardioIsFree, filoLeft, planLine, proUntilText } from '@/src/features/pro/model';
import type { Entitlement } from '@/src/lib/api/entitlement';
import { isProRequired } from '@/src/lib/api/entitlement';

const mockPush = jest.fn();
const mockRedeem = jest.fn();
const mockGetEntitlement = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }), useLocalSearchParams: () => mockParams }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/src/components/ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/src/components/ui/PageHeader', () => ({ PageHeader: () => null }));
jest.mock('@/src/lib/api/entitlement', () => ({
  ...jest.requireActual('@/src/lib/api/entitlement'),
  getEntitlement: () => mockGetEntitlement(),
}));
jest.mock('@/src/lib/api/invites', () => ({ redeemInviteCode: (code: string) => mockRedeem(code) }));
jest.mock('@/src/features/appConfig/store', () => ({ useFeatureFlag: () => true }));
jest.mock('@/src/features/workouts/ui/Toast', () => ({ useToast: () => jest.fn() }));

const FREE: Entitlement = { plan: 'free', pro_until: null, filo: { daily_limit: 5, used_today: 2, resets_at: '2026-11-11T00:00:00Z' } };
const PRO: Entitlement = { plan: 'pro', pro_until: '2026-12-10T08:00:00Z', source: 'invite', filo: { daily_limit: 0, used_today: 0, resets_at: '' } };

const store = () => require('@/src/features/pro/store') as typeof import('@/src/features/pro/store');

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  store()._resetProStore();
  await require('@/src/lib/cache').cacheClear?.().catch?.(() => undefined);
});

describe('model', () => {
  it('describes the plan', () => {
    expect(planLine(null)).toBe('Free plan');
    expect(planLine(FREE)).toBe('Free plan');
    expect(planLine(PRO)).toMatch(/^Pro until .*2026$/);
    expect(planLine({ ...PRO, pro_until: null })).toBe('Pro');
    expect(proUntilText('nope')).toBeNull();
  });
  it('counts free Filo messages left', () => {
    expect(filoLeft(FREE)).toBe(3);
    expect(filoLeft({ ...FREE, filo: { ...FREE.filo, used_today: 9 } })).toBe(0);
    expect(filoLeft(PRO)).toBeNull();
    expect(filoLeft(null)).toBeNull();
  });
  it('keeps three cardio programs free', () => {
    expect(['warm-gentle', 'fat-burn', 'run-walk'].every(cardioIsFree)).toBe(true);
    expect(cardioIsFree('sprints')).toBe(false);
  });
  it('recognises a Pro refusal', () => {
    expect(isProRequired(Object.assign(new Error('x'), { status: 402, code: 'pro_required' }))).toBe(true);
    expect(isProRequired(Object.assign(new Error('x'), { status: 500 }))).toBe(false);
    expect(photoErrorKind(Object.assign(new Error('x'), { status: 402 }))).toBe('pro');
  });
});

describe('ProScreen', () => {
  const { ProScreen } = require('@/src/features/pro/ProScreen');

  it('free: explains Pro codes and a code unlocks Pro', async () => {
    mockGetEntitlement.mockResolvedValueOnce(FREE).mockResolvedValueOnce(PRO);
    mockRedeem.mockResolvedValue({ access_expires_at: '2026-12-10T08:00:00Z', duration_days: 30 });
    render(<ProScreen />);
    expect(await screen.findByTestId('pro-unlock')).toBeOnTheScreen();
    expect(screen.getByText("Available with a Pro code, or earn it by referring friends. Subscriptions launch with the app's store release.")).toBeOnTheScreen();
    expect(screen.getByText('Unlimited Filo')).toBeOnTheScreen();
    expect(screen.queryByTestId('pro-subscribe')).toBeNull();

    const field = screen.getByLabelText('Pro code');
    fireEvent.changeText(field, 'abcd-ef23-45');
    expect(field).toHaveProp('value', 'ABCDEF2345');
    fireEvent.press(screen.getByTestId('pro-redeem-submit'));
    await waitFor(() => expect(mockRedeem).toHaveBeenCalledWith('ABCDEF2345'));
    expect(await screen.findByText('Code redeemed: 30 days of Pro added.')).toBeOnTheScreen();
    expect(await screen.findByText("You're on Pro")).toBeOnTheScreen();
    expect(screen.queryByTestId('pro-unlock')).toBeNull();
  });

  it("shows the backend's reason when a code fails", async () => {
    mockGetEntitlement.mockResolvedValue(FREE);
    mockRedeem.mockRejectedValue(Object.assign(new Error('That code has already been used by another account.'), { isRedeemError: true, code: 'INVITE_USED' }));
    render(<ProScreen />);
    fireEvent.changeText(screen.getByLabelText('Pro code'), 'ABCDEF2345');
    fireEvent.press(screen.getByTestId('pro-redeem-submit'));
    expect(await screen.findByText('That code has already been used by another account.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Pro code'), 'BCDEF23456');
    expect(screen.queryByText('That code has already been used by another account.')).toBeNull();
  });

  it('does not offer activation before the membership is known', async () => {
    mockGetEntitlement.mockReturnValue(new Promise(() => {}));
    render(<ProScreen />);
    expect(screen.getByText('Checking your membership…')).toBeOnTheScreen();
    expect(screen.queryByTestId('pro-unlock')).toBeNull();
    await act(async () => {});
  });

  it('the redeem button waits for a full code', async () => {
    mockGetEntitlement.mockResolvedValue(FREE);
    render(<ProScreen />);
    await screen.findByTestId('pro-unlock');
    fireEvent.changeText(screen.getByLabelText('Pro code'), 'ABC');
    expect(screen.getByTestId('pro-redeem-submit')).toBeDisabled();
  });

  it('a referral code typed as a Pro code points to Refer friends, never redeems', async () => {
    mockGetEntitlement.mockResolvedValue(FREE);
    render(<ProScreen />);
    await screen.findByTestId('pro-unlock');
    fireEvent.changeText(screen.getByLabelText('Pro code'), 'k7m9p2q');
    fireEvent.press(screen.getByTestId('pro-redeem-submit'));
    expect(screen.getByText("That's a friend's referral code (7 characters). Enter it on Refer friends.")).toBeOnTheScreen();
    expect(mockRedeem).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('pro-redeem-to-referrals'));
    expect(mockPush).toHaveBeenCalledWith('/referrals');
  });

  it('links to Refer friends', async () => {
    mockGetEntitlement.mockResolvedValue(FREE);
    render(<ProScreen />);
    fireEvent.press(await screen.findByTestId('pro-refer'));
    expect(mockPush).toHaveBeenCalledWith('/referrals');
  });
});

describe('where Pro shows up', () => {
  it('Settings: the plan row, the Pro-code row and Refer friends', async () => {
    mockGetEntitlement.mockResolvedValue(FREE);
    const { ProSettingsSection } = require('@/src/features/pro/ProSettingsSection');
    render(<ProSettingsSection />);
    expect(await screen.findByText('Free plan · see what Pro adds')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Pro code'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/pro', params: { redeem: '1' } });
    fireEvent.press(screen.getByText('Refer friends'));
    expect(mockPush).toHaveBeenCalledWith('/referrals');
    fireEvent.press(screen.getByText('FitNyx Pro'));
    expect(mockPush).toHaveBeenCalledWith('/pro');
  });

  it('profile: Get Pro on free, the PRO mark on Pro, nothing while unknown', async () => {
    const { PlanPill } = require('@/src/features/pro/PlanPill');
    let resolve!: (e: Entitlement) => void;
    mockGetEntitlement.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(<PlanPill />);
    expect(screen.queryByTestId('plan-pill-get-pro')).toBeNull();
    await act(async () => resolve(FREE));
    fireEvent.press(await screen.findByTestId('plan-pill-get-pro'));
    expect(mockPush).toHaveBeenCalledWith('/pro');
    mockGetEntitlement.mockResolvedValueOnce(PRO);
    await act(async () => { await store().refreshEntitlement(); });
    expect(screen.getByLabelText('Pro feature')).toBeOnTheScreen();
  });

  it('meal photo: free opens Pro instead of the camera', async () => {
    mockGetEntitlement.mockResolvedValue(FREE);
    const { PhotoEntry } = require('@/src/features/diet/photo/PhotoEntry');
    const onPicked = jest.fn();
    render(<PhotoEntry onPicked={onPicked} />);
    expect(await screen.findByLabelText('Pro feature')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Take photo'));
    expect(mockPush).toHaveBeenCalledWith('/pro');
    expect(onPicked).not.toHaveBeenCalled();
  });
});
