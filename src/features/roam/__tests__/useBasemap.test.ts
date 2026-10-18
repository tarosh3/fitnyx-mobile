import { act, renderHook, waitFor } from '@testing-library/react-native';

import { FALLBACK_STYLE_URL, roamMapStyle } from '@/src/features/roam/mapStyle';
import { resetBasemapCheck, useBasemap } from '@/src/features/roam/useBasemap';

let mockOnline = true;
jest.mock('@/src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: mockOnline }) }));

const realFetch = global.fetch;
const reply = (ok: boolean) => {
  global.fetch = jest.fn(async () => (ok ? { ok: true } : Promise.reject(new Error('down')))) as unknown as typeof fetch;
};

beforeEach(() => {
  mockOnline = true;
  resetBasemapCheck();
});
afterAll(() => {
  global.fetch = realFetch;
});

describe('useBasemap', () => {
  it('uses the bundled OpenFreeMap style when its tiles answer', async () => {
    reply(true);
    const { result } = renderHook(() => useBasemap('dark'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current.style).toBe(roamMapStyle('dark'));
    expect(result.current.isFallback).toBe(false);
  });

  it('switches to VersaTiles when OpenFreeMap is unreachable', async () => {
    reply(false);
    const { result } = renderHook(() => useBasemap('light'));
    await waitFor(() => expect(result.current.style).toBe(FALLBACK_STYLE_URL.light));
    expect(result.current.isFallback).toBe(true);
    // The backup failing too leaves no basemap: the caller draws its sketch.
    act(() => result.current.onLoadFailed());
    expect(result.current.style).toBeNull();
  });

  it('offline: no basemap at all, without probing', async () => {
    mockOnline = false;
    reply(true);
    const { result } = renderHook(() => useBasemap('dark'));
    await waitFor(() => expect(result.current.style).toBeNull());
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
