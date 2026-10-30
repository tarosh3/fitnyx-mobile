import React from 'react';
import { render, screen } from '@testing-library/react-native';

import type { Readiness } from '../readiness';

// Mock the data hook so the card renders without the health/auth chain.
const mockUse = jest.fn();
jest.mock('../useReadiness', () => ({ useReadiness: () => mockUse() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const colors = {
  card: '#111', text: '#fff', mutedText: '#999', border: '#333',
  success: '#22C55E', warning: '#F59E0B', destructive: '#EF4444', primary: '#5fc793',
  progress: { empty: '#222' },
};
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => colors }));

import { ReadinessCard } from '../ui/ReadinessCard';

const driver = (value: number | null, baseline: number | null, status: string) =>
  ({ value, baseline, score: status === 'none' ? null : 0.7, status } as never);

const readiness = (over: Partial<Readiness>): Readiness => ({
  score: 78, band: 'primed', reason: 'HRV above your baseline — good day to push',
  drivers: { hrv: driver(60, 50, 'good'), rhr: driver(48, 55, 'good'), sleep: driver(8, 8, 'good') },
  baselineDays: 20,
  ...over,
});

describe('ReadinessCard', () => {
  afterEach(() => mockUse.mockReset());

  it('renders the score and reason when scored', () => {
    mockUse.mockReturnValue({ readiness: readiness({}), series: [{ date: 'd', hrvMs: 60, restingHr: 48, sleepHours: 8 }] });
    render(<ReadinessCard />);
    expect(screen.getByText('78')).toBeOnTheScreen();
    expect(screen.getByText(/good day to push/)).toBeOnTheScreen();
    expect(screen.getByText(/READINESS · PRIMED/)).toBeOnTheScreen();
  });

  it('shows a dash and Building while the baseline warms up', () => {
    const r = readiness({ score: null, band: 'insufficient', reason: 'Building your baseline (4/7 days)', baselineDays: 4 });
    mockUse.mockReturnValue({ readiness: r, series: [{ date: 'd', hrvMs: 55, restingHr: null, sleepHours: null }] });
    render(<ReadinessCard />);
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByText(/READINESS · BUILDING/)).toBeOnTheScreen();
  });

  it('renders nothing when the health store has no readiness data', () => {
    const r = readiness({ score: null, band: 'insufficient', reason: 'Connect a watch or ring to measure readiness', baselineDays: 0 });
    mockUse.mockReturnValue({ readiness: r, series: [] });
    const { toJSON } = render(<ReadinessCard />);
    expect(toJSON()).toBeNull();
  });
});
