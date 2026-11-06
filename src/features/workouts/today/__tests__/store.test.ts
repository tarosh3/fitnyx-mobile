import { loadTodayRun, saveTodayRun } from '../store';
import { getIdMapping } from '@/src/lib/offline/offlineStore';

const saved: Record<string, unknown> = {};
jest.mock('@/src/lib/cache/indexeddb', () => ({
  idbGetStale: jest.fn(async (k: string) => saved[k] ?? null),
  idbSet: jest.fn(async (k: string, v: unknown) => { saved[k] = v; }),
}));
jest.mock('@/src/lib/offline/offlineStore', () => {
  const mapping = jest.fn(async () => null as string | null);
  return {
    getIdMapping: mapping,
    resolveId: async (id: string) => (id.startsWith('offline') ? (await mapping()) ?? id : id),
  };
});

const run = { sessionId: 's1', title: 'Legs', items: [] };

it('finds the plan of its own session only', async () => {
  await saveTodayRun(run);
  await expect(loadTodayRun('s1')).resolves.toEqual(run);
  await expect(loadTodayRun('s2')).resolves.toBeNull();
});

it('still finds it after an offline-started session got its server id', async () => {
  await saveTodayRun({ ...run, sessionId: 'offline-1' });
  (getIdMapping as jest.Mock).mockResolvedValue('server-1');
  await expect(loadTodayRun('server-1')).resolves.toMatchObject({ title: 'Legs' });
});
