import { renderHook, act, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

import { useNetworkStatus } from '../useNetworkStatus';

describe('useNetworkStatus', () => {
  let listenerCallback: (state: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listenerCallback = cb;
      return jest.fn(); // unsubscribe
    });
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  it('starts as online after initial fetch resolves', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('subscribes to NetInfo on mount', () => {
    renderHook(() => useNetworkStatus());
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('updates to offline when network disconnects', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Wait for initial fetch to settle
    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    act(() => {
      listenerCallback({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('updates back to online when network reconnects', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    act(() => {
      listenerCallback({ isConnected: false, isInternetReachable: false });
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      listenerCallback({ isConnected: true, isInternetReachable: true });
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('cleans up listener on unmount', async () => {
    const unsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkStatus());

    await waitFor(() => {});

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
