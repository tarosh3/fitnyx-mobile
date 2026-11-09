const mockStore = new Map<string, unknown>();
const mockGetDayTargets = jest.fn();

jest.mock('@/src/lib/cache', () => ({
  cacheKeys: {
    activeProgram: (u: string) => `program:active:${u}`,
    programTargets: (u: string, d: string) => `program:targets:${u}:${d}`,
  },
  cacheTTL: { DAY: 1, LONG: 1 },
  cacheGetStale: async (k: string) => mockStore.get(k) ?? null,
  cacheSet: async (k: string, v: unknown) => { mockStore.set(k, v); },
}));
jest.mock('@/src/lib/api/programs', () => ({ getDayTargets: (id: string) => mockGetDayTargets(id) }));
jest.mock('@/src/features/workouts/hooks', () => ({ useCachedResource: jest.fn() }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
let mockPro = true;
jest.mock('@/src/features/pro/store', () => ({ isProNow: () => mockPro, useEntitlement: () => ({ isPro: mockPro, loaded: true }) }));

import { loadProgramTargets } from '@/src/features/program/data';

const targets = { day_id: 'd1', week: 2, phase: { kind: 'build', extra_set: false }, items: [] };

beforeEach(() => {
  mockStore.clear();
  mockGetDayTargets.mockReset();
});

it("doesn't ask for a day outside the active program", async () => {
  expect(await loadProgramTargets('u', 'd1')).toBeNull();
  mockStore.set('program:active:u', { days: [{ id: 'other' }] });
  expect(await loadProgramTargets('u', 'd1')).toBeNull();
  expect(mockGetDayTargets).not.toHaveBeenCalled();
});

it("free (a lapsed Pro): no call, the day's saved targets stand", async () => {
  mockPro = false;
  mockStore.set('program:active:u', { days: [{ id: 'd1' }] });
  expect(await loadProgramTargets('u', 'd1')).toBeNull();
  expect(mockGetDayTargets).not.toHaveBeenCalled();
  mockPro = true;
});

it('saves the targets, and falls back to them offline', async () => {
  mockStore.set('program:active:u', { days: [{ id: 'd1' }] });
  mockGetDayTargets.mockResolvedValueOnce(targets);
  expect(await loadProgramTargets('u', 'd1')).toEqual(targets);
  expect(mockStore.get('program:targets:u:d1')).toEqual(targets);

  mockGetDayTargets.mockRejectedValueOnce(new Error('Network request failed'));
  expect(await loadProgramTargets('u', 'd1')).toEqual(targets);
});
