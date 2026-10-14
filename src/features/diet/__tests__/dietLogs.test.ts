import { mergeDayLogs, pendingDietChanges, removeMealLog, saveMealLog } from '@/src/features/diet/data/dietLogs';
import { createDietLog, deleteDietLog, type CreateDietLogInput, type DietLog } from '@/src/lib/api/diet';
import { clearOfflineQueue, getOfflineQueue } from '@/src/lib/cache/indexeddb';

jest.mock('@/src/lib/api/diet', () => ({ createDietLog: jest.fn(), deleteDietLog: jest.fn() }));

const mockCreate = createDietLog as jest.MockedFunction<typeof createDietLog>;
const mockDelete = deleteDietLog as jest.MockedFunction<typeof deleteDietLog>;

const httpError = (status?: number) => Object.assign(new Error('fail'), status ? { status } : {});

const input = (id: string, date = '2026-10-14'): CreateDietLogInput => ({
  client_log_id: id, local_date: date, slot: 'lunch', source: 'food', name: 'Dal and roti',
  items: [
    { food_id: 1, name: 'Dal tadka', portion_label: '1 katori', qty: 1, kcal: 180, protein_g: 9, carbs_g: 22, fat_g: 6.5, is_veg: true },
    { food_id: 2, name: 'Roti', portion_label: '1 roti', qty: 2, kcal: 106, protein_g: 3.4, carbs_g: 18, fat_g: 2.5, is_veg: true },
  ],
});

const stored = (id: string): DietLog => ({ ...input(id), plan_meal_index: null, kcal: 392, protein_g: 15.8, carbs_g: 58, fat_g: 11.5, created_at: 't' });

describe('diet log saving', () => {
  beforeEach(async () => {
    await clearOfflineQueue();
    mockCreate.mockReset();
    mockDelete.mockReset();
  });

  it('saves online without queueing', async () => {
    mockCreate.mockResolvedValue(stored('a') as never);
    await expect(saveMealLog(input('a'))).resolves.toBe('saved');
    expect(await getOfflineQueue()).toHaveLength(0);
  });

  it('queues when offline or on a server error, but not on a rejection', async () => {
    mockCreate.mockRejectedValueOnce(httpError()).mockRejectedValueOnce(httpError(503)).mockRejectedValueOnce(httpError(400));
    await expect(saveMealLog(input('a'))).resolves.toBe('queued');
    await expect(saveMealLog(input('b'))).resolves.toBe('queued');
    await expect(saveMealLog(input('c'))).rejects.toThrow('fail');
    expect((await getOfflineQueue()).map((m) => [m.type, m.payload.client_log_id])).toEqual([['LOG_MEAL', 'a'], ['LOG_MEAL', 'b']]);
  });

  it('drops a queued meal on delete without calling the server', async () => {
    mockCreate.mockRejectedValue(httpError());
    await saveMealLog(input('a'));
    await removeMealLog('a');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(await getOfflineQueue()).toHaveLength(0);
  });

  it('deletes stored meals, treats 404 as done and queues offline deletes', async () => {
    mockDelete.mockResolvedValueOnce(undefined).mockRejectedValueOnce(httpError(404)).mockRejectedValueOnce(httpError());
    await removeMealLog('a');
    await removeMealLog('b');
    await removeMealLog('c');
    expect((await getOfflineQueue()).map((m) => [m.type, m.payload.clientLogId])).toEqual([['DELETE_MEAL_LOG', 'c']]);
  });

  it('merges queued changes into the day', async () => {
    mockCreate.mockRejectedValue(httpError());
    mockDelete.mockRejectedValue(httpError());
    await saveMealLog(input('queued'));
    await saveMealLog(input('other-day', '2026-10-13'));
    await removeMealLog('gone');
    const day = mergeDayLogs([stored('kept'), stored('gone')], await pendingDietChanges(), '2026-10-14');
    expect(day.map((l) => l.client_log_id)).toEqual(['kept', 'queued']);
    expect(day[1]).toMatchObject({ kcal: 392, protein_g: 15.8, carbs_g: 58, fat_g: 11.5, plan_meal_index: null });
  });
});
