import { render } from '@testing-library/react-native';
import React from 'react';

import { SyncManager } from '../SyncManager';
import { prefetchWorkoutMedia } from '@/src/lib/offline/mediaPrefetch';

let mockUser: { id: string } | null = null;
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@/src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: true }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('@/src/lib/cache/indexeddb', () => ({ getOfflineQueue: jest.fn(async () => []), onOfflineQueueAdd: jest.fn(() => () => undefined) }));
jest.mock('@/src/lib/offline/syncEngine', () => ({ onOfflineSync: jest.fn(() => () => undefined), processOfflineQueue: jest.fn(async () => ({})) }));
jest.mock('@/src/lib/offline/mediaPrefetch', () => ({ prefetchWorkoutMedia: jest.fn(async () => undefined) }));

beforeEach(() => (prefetchWorkoutMedia as jest.Mock).mockClear());

it('downloads nothing while signed out: a call with no session would sign a new user "out"', () => {
  mockUser = null;
  render(<SyncManager />);
  expect(prefetchWorkoutMedia).not.toHaveBeenCalled();
});

it('downloads once someone is signed in', () => {
  mockUser = { id: 'u1' };
  render(<SyncManager />);
  expect(prefetchWorkoutMedia).toHaveBeenCalledTimes(1);
});
