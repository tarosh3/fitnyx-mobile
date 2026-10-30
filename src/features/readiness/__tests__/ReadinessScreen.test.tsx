import React from 'react';
import { render, screen } from '@testing-library/react-native';

import type { Readiness, ReadinessDriver } from '../readiness';

const mockUse = jest.fn();
jest.mock('../useReadiness', () => ({ useReadiness: () => mockUse() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const colors = {
  background: '#000', card: '#111', text: '#fff', mutedText: '#999', border: '#333',
  success: '#22C55E', warning: '#F59E0B', destructive: '#EF4444', primary: '#5fc793',
  progress: { empty: '#222' },
};
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => colors }));

import ReadinessScreen from '@/app/readiness';

const d = (value: number | null, baseline: number | null, status: ReadinessDriver['status']): ReadinessDriver => ({
  value, baseline, score: status === 'none' ? null : 0.7, status,
});

const series = Array.from({ length: 14 }, (_, i) => ({ date: `d${i}`, hrvMs: 50 + i, restingHr: 55, sleepHours: 8 }));

describe('ReadinessScreen', () => {
  afterEach(() => mockUse.mockReset());

  it('renders the score, the three drivers and the trend', () => {
    const readiness: Readiness = {
      score: 78, band: 'primed', reason: 'HRV above your baseline — good day to push',
      drivers: { hrv: d(66, 50, 'good'), rhr: d(48, 55, 'good'), sleep: d(8, 8, 'good') },
      baselineDays: 14,
    };
    mockUse.mockReturnValue({ readiness, series, refresh: jest.fn() });
    render(<ReadinessScreen />);
    expect(screen.getByText('78')).toBeOnTheScreen();
    expect(screen.getByText('PRIMED')).toBeOnTheScreen();
    expect(screen.getByText('HRV')).toBeOnTheScreen();
    expect(screen.getByText('Resting HR')).toBeOnTheScreen();
    expect(screen.getByText('Sleep')).toBeOnTheScreen();
    expect(screen.getByText(/compares last night/)).toBeOnTheScreen();
  });

  it('renders a not-ready state without crashing when there is no data', () => {
    const readiness: Readiness = {
      score: null, band: 'insufficient', reason: 'Connect a watch or ring to measure readiness',
      drivers: { hrv: d(null, null, 'none'), rhr: d(null, null, 'none'), sleep: d(null, 8, 'none') },
      baselineDays: 0,
    };
    mockUse.mockReturnValue({ readiness, series: [], refresh: jest.fn() });
    render(<ReadinessScreen />);
    expect(screen.getByText('NOT READY')).toBeOnTheScreen();
    expect(screen.getByText(/Connect a watch/)).toBeOnTheScreen();
  });
});
