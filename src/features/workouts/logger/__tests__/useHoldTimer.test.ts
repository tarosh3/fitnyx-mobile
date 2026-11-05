import { act, renderHook } from '@testing-library/react-native';

import { useHoldTimer } from '@/src/features/workouts/logger/useHoldTimer';

jest.mock('@/src/lib/haptics', () => ({ haptic: { medium: jest.fn(), success: jest.fn() } }));

describe('useHoldTimer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stopping a countdown early gives the seconds held', () => {
    const { result } = renderHook(() => useHoldTimer(jest.fn()));
    act(() => result.current.start(0, 0, 60));
    act(() => { jest.advanceTimersByTime(20_000); });
    expect(result.current.hold?.left).toBe(40);
    let held = 0;
    act(() => { held = result.current.stop(60); });
    expect(held).toBe(20);
    expect(result.current.hold).toBeNull();
  });

  it('stopping a stopwatch gives the seconds so far, whatever the target', () => {
    const { result } = renderHook(() => useHoldTimer(jest.fn()));
    act(() => result.current.start(0, 0, 1200, { up: true }));
    act(() => { jest.advanceTimersByTime(7_000); });
    let held = 0;
    act(() => { held = result.current.stop(1200); });
    expect(held).toBe(7);
  });

  it('a countdown reaching zero finishes by itself; a stopwatch never does', () => {
    const onFinish = jest.fn();
    const { result } = renderHook(() => useHoldTimer(onFinish));
    act(() => result.current.start(1, 2, 5));
    act(() => { jest.advanceTimersByTime(6_000); });
    expect(onFinish).toHaveBeenCalledWith(1, 2);

    onFinish.mockClear();
    act(() => result.current.start(1, 2, 5, { up: true }));
    act(() => { jest.advanceTimersByTime(60_000); });
    expect(onFinish).not.toHaveBeenCalled();
  });
});
