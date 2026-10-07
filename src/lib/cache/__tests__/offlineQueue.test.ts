import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  updateOfflineQueue,
} from '@/src/lib/cache/indexeddb';

describe('offline queue concurrency', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps a mutation added while another is being removed', async () => {
    await addToOfflineQueue({ type: 'LOG_SET', payload: { n: 1 } });
    await addToOfflineQueue({ type: 'LOG_SET', payload: { n: 2 } });
    const [first] = await getOfflineQueue();

    // Sync engine removes #1 while the user logs #3.
    await Promise.all([
      removeFromOfflineQueue(first.id),
      addToOfflineQueue({ type: 'LOG_SET', payload: { n: 3 } }),
    ]);

    expect((await getOfflineQueue()).map((m) => m.payload.n)).toEqual([2, 3]);
  });

  it('does not lose any of many concurrent adds', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, n) => addToOfflineQueue({ type: 'LOG_SET', payload: { n } })),
    );
    expect(await getOfflineQueue()).toHaveLength(10);
  });

  it('updateOfflineQueue deletes the key when the queue empties', async () => {
    await addToOfflineQueue({ type: 'LOG_SET', payload: {} });
    await updateOfflineQueue(() => []);
    expect(await getOfflineQueue()).toEqual([]);
    expect(await AsyncStorage.getAllKeys()).not.toContain('fitnyx-cache:offline-mutation-queue');
  });
});
