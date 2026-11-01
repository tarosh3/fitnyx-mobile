import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking, Text } from 'react-native';

const mockFetch = jest.fn();
jest.mock('@/src/lib/api/appConfig', () => ({ fetchAppConfig: () => mockFetch() }));
const mockStore = new Map<string, unknown>();
jest.mock('@/src/lib/cache', () => ({
  cacheKeys: {
    appConfig: (b: string) => `cfg:${b}`,
    appNoticeDismissed: (n: string) => `dismissed:${n}`,
  },
  cacheTTL: { DAY: 86_400_000 },
  cacheGetStale: async (k: string) => mockStore.get(k) ?? null,
  cacheSet: async (k: string, v: unknown) => { mockStore.set(k, v); },
}));
jest.mock('@/src/lib/api', () => ({ API_BASE_URL: 'http://api' }));
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0' }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../ota', () => ({ checkForOtaUpdate: jest.fn(async () => false) }));

import { AppGate } from '../AppGate';
import { _resetAppConfigStore, useFeatureFlag } from '../store';
import { AppNoticeCard } from '../ui/AppNoticeCard';

const config = (over: Record<string, unknown> = {}) => ({
  min_version: '1.0.0', latest_version: '1.0.0', update_url_android: null, update_url_ios: null,
  maintenance_message: null, banner_message: null, banner_level: 'info', features: {}, ...over,
});

function Flag() {
  return <Text>{useFeatureFlag('arena') ? 'flag-on' : 'flag-off'}</Text>;
}

beforeEach(() => {
  _resetAppConfigStore();
  mockStore.clear();
  mockFetch.mockReset();
});

describe('AppGate', () => {
  it('renders nothing when the build is supported', async () => {
    mockFetch.mockResolvedValue(config({ features: { arena: true } }));
    render(<><AppGate /><Flag /></>);
    await waitFor(() => expect(screen.getByText('flag-on')).toBeOnTheScreen());
    expect(screen.queryByTestId('app-gate-update')).not.toBeOnTheScreen();
  });

  it('blocks an outdated build and opens the store', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const url = 'https://store.example/fitnyx';
    mockFetch.mockResolvedValue(config({ min_version: '1.1.0', update_url_android: url, update_url_ios: url }));
    render(<AppGate />);
    fireEvent.press(await screen.findByText('Update FitNyx'));
    expect(open).toHaveBeenCalledWith(url);
  });

  it('shows maintenance and clears it on Try again', async () => {
    mockFetch.mockResolvedValueOnce(config({ maintenance_message: 'Upgrading things' }));
    render(<AppGate />);
    expect(await screen.findByText('Upgrading things')).toBeOnTheScreen();
    mockFetch.mockResolvedValueOnce(config());
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.queryByTestId('app-gate-maintenance')).not.toBeOnTheScreen());
  });

  it('keeps the app usable when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    render(<><AppGate /><Flag /></>);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.getByText('flag-off')).toBeOnTheScreen();
    expect(screen.queryByTestId('app-gate-update')).not.toBeOnTheScreen();
  });

  it('applies a saved forced update offline, but not a saved maintenance', async () => {
    const url = 'https://store.example/fitnyx';
    mockStore.set('cfg:http://api', config({ min_version: '2.0.0', maintenance_message: 'old', update_url_android: url, update_url_ios: url }));
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    render(<AppGate />);
    expect(await screen.findByTestId('app-gate-update')).toBeOnTheScreen();
    expect(screen.queryByTestId('app-gate-maintenance')).not.toBeOnTheScreen();
  });
});

describe('AppNoticeCard', () => {
  it('shows the banner and update card, and remembers a close', async () => {
    const url = 'https://store.example/fitnyx';
    mockFetch.mockResolvedValue(config({ latest_version: '1.0.1', banner_message: 'Arena is live!', update_url_android: url, update_url_ios: url }));
    render(<><AppGate /><AppNoticeCard /></>);
    expect(await screen.findByText('Arena is live!')).toBeOnTheScreen();
    expect(screen.getByText('A new version of FitNyx is available.')).toBeOnTheScreen();

    fireEvent.press(screen.getAllByLabelText('Close')[1]);
    await waitFor(() => expect(screen.queryByText('Arena is live!')).not.toBeOnTheScreen());
    expect(mockStore.get('dismissed:banner:Arena is live!')).toBe(true);
  });
});
