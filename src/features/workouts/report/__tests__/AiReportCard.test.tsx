import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AiReportCard } from '@/src/features/workouts/report/AiReportCard';
import { cacheClear } from '@/src/lib/cache';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => require('@/src/theme/colors').colors.dark,
}));
jest.mock('@/src/features/workouts/ui/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('@/src/features/workouts/report/exportFile', () => ({ sharePdf: jest.fn(), reportFileName: () => 'x.pdf' }));
const mockFetch = jest.fn();
const mockRequest = jest.fn();
jest.mock('@/src/lib/api/reports', () => ({
  fetchAiReport: () => mockFetch(),
  requestAiReport: () => mockRequest(),
}));

const base = { unlocked: true, training_days: 12, required_days: 10, report: null, generating: false, next_available_at: null };
const ready = {
  ...base,
  report: { id: 'r', status: 'ready', period_from: '2026-09-22', period_to: '2026-10-19', content: '## Summary\nStrong **month**.', created_at: '2026-10-19T10:00:00Z', completed_at: null },
  next_available_at: '2026-10-26T10:00:00Z',
};

describe('AiReportCard', () => {
  beforeEach(async () => {
    await cacheClear();
    mockFetch.mockReset();
    mockRequest.mockReset();
  });

  it('shows progress while locked', async () => {
    mockFetch.mockResolvedValue({ ...base, unlocked: false, training_days: 7 });
    render(<AiReportCard userId="u" />);
    expect(await screen.findByText('Unlocks after 10 training days')).toBeOnTheScreen();
    expect(screen.getByText(/7 of 10 days done\. Train on 3 more days/)).toBeOnTheScreen();
  });

  it('writes a report, waits for it and offers the next date', async () => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValueOnce(base).mockResolvedValueOnce(ready);
    mockRequest.mockResolvedValue({ ...base, generating: true });
    render(<AiReportCard userId="u" />);
    fireEvent.press(await screen.findByTestId('ai-report-generate'));
    expect(await screen.findByText(/Your coach is writing your report/)).toBeOnTheScreen();
    await act(async () => { jest.advanceTimersByTime(3100); });
    await waitFor(() => expect(screen.getByText('Read report')).toBeOnTheScreen());
    expect(screen.getByText(/Your next report is ready to write on Mon 26 Oct/)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Read report'));
    expect(screen.getByText('Summary')).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('explains a refusal inside the card', async () => {
    mockFetch.mockResolvedValue(base);
    mockRequest.mockRejectedValue(Object.assign(new Error('Couldn’t write your report just now. Try again in a few minutes.'), { status: 503 }));
    render(<AiReportCard userId="u" />);
    fireEvent.press(await screen.findByTestId('ai-report-generate'));
    expect(await screen.findByText('Couldn’t write your report just now. Try again in a few minutes.')).toBeOnTheScreen();
  });
});
