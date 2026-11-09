import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { BestEfforts } from '@/src/features/roam/components/BestEfforts';
import { GhostLiveCard, RaceResultCard } from '@/src/features/roam/components/GhostCards';
import { RaceRow } from '@/src/features/roam/components/RacePicker';
import type { GhostTarget } from '@/src/features/roam/ghost';

jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));

const ghost = { title: 'Morning Stride', startedAt: '2026-10-10T06:30:00Z' };
const splits = (...secs: number[]) => secs.map((sec, i) => ({ km: i + 1, sec }));

describe('GhostLiveCard', () => {
  it('shows the gap while racing', () => {
    render(<GhostLiveCard ghost={ghost} state={{ kind: 'racing', aheadSec: 109, aheadM: 139, ghostM: 102 }} />);
    expect(screen.getByText('1:49 ahead')).toBeOnTheScreen();
    expect(screen.getByText(/139 m in front · vs Morning Stride/)).toBeOnTheScreen();
  });
  it('shows behind, the warm-up and the finish', () => {
    const { rerender } = render(<GhostLiveCard ghost={ghost} state={{ kind: 'racing', aheadSec: -12, aheadM: -40, ghostM: 500 }} />);
    expect(screen.getByText('0:12 behind')).toBeOnTheScreen();
    expect(screen.getByText(/40 m back/)).toBeOnTheScreen();
    rerender(<GhostLiveCard ghost={ghost} state={{ kind: 'warmup' }} />);
    expect(screen.getByText('Ready')).toBeOnTheScreen();
    rerender(<GhostLiveCard ghost={ghost} state={{ kind: 'done', marginSec: 453 }} />);
    expect(screen.getByText('Won by 7:33')).toBeOnTheScreen();
  });
});

describe('RaceResultCard', () => {
  it('says who won', () => {
    const { rerender } = render(<RaceResultCard ghost={ghost} ghostDistanceM={4990} myDistanceM={5100} state={{ kind: 'done', marginSec: 42 }} />);
    expect(screen.getByText('You beat your ghost by 0:42')).toBeOnTheScreen();
    rerender(<RaceResultCard ghost={ghost} ghostDistanceM={4990} myDistanceM={5000} state={{ kind: 'done', marginSec: -15 }} />);
    expect(screen.getByText('Your ghost won by 0:15')).toBeOnTheScreen();
  });
  it('explains a race stopped short', () => {
    render(<RaceResultCard ghost={ghost} ghostDistanceM={4990} myDistanceM={3790} state={{ kind: 'racing', aheadSec: 20, aheadM: 60, ghostM: 3730 }} />);
    expect(screen.getByText('Race not finished')).toBeOnTheScreen();
    expect(screen.getByText(/You stopped 1.20 km before its finish, 0:20 ahead at that point/)).toBeOnTheScreen();
  });
});

it('RaceRow opens the picker, and ✕ clears without opening it', () => {
  const onOpen = jest.fn();
  const onClear = jest.fn();
  const target = { ...ghost, distanceM: 4990, movingSec: 1686 } as GhostTarget;
  const { rerender } = render(<RaceRow ghost={null} onOpen={onOpen} onClear={onClear} />);
  fireEvent.press(screen.getByText('Race a past Roam'));
  expect(onOpen).toHaveBeenCalledTimes(1);
  rerender(<RaceRow ghost={target} onOpen={onOpen} onClear={onClear} />);
  expect(screen.getByText('Racing Morning Stride')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Stop racing'));
  expect(onClear).toHaveBeenCalledTimes(1);
});

describe('BestEfforts', () => {
  it('lists the fastest stretches and crowns an all-time best', () => {
    render(<BestEfforts activityId="r1" splits={splits(340, 332, 335, 340, 338)}
      records={[{ km: 1, sec: 332, date: '2026-10-10', activity_id: 'r1' }, { km: 5, sec: 1600, date: '2026-10-01', activity_id: 'other' }]} />);
    expect(screen.getByText('Fastest 1 km')).toBeOnTheScreen();
    expect(screen.getByText('Km 2')).toBeOnTheScreen();
    expect(screen.getByText('5:32')).toBeOnTheScreen();
    expect(screen.getByText('Fastest 5 km')).toBeOnTheScreen();
    expect(screen.getByText('Km 1–5')).toBeOnTheScreen();
    // Only the 1 km is this Roam's record.
    expect(screen.getAllByText('All-time best')).toHaveLength(1);
  });
  it('shows nothing under 1 km', () => {
    render(<BestEfforts activityId="r1" splits={[]} />);
    expect(screen.queryByTestId('best-efforts')).toBeNull();
  });
});
