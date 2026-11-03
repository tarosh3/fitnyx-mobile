const mockUpdates = {
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
};
jest.mock('expo-updates', () => ({
  get isEnabled() { return mockUpdates.isEnabled; },
  checkForUpdateAsync: () => mockUpdates.checkForUpdateAsync(),
  fetchUpdateAsync: () => mockUpdates.fetchUpdateAsync(),
}));

import { _resetOtaCheck, checkForOtaUpdate } from '../ota';

beforeEach(() => {
  _resetOtaCheck();
  mockUpdates.isEnabled = true;
  mockUpdates.checkForUpdateAsync.mockReset();
  mockUpdates.fetchUpdateAsync.mockReset();
});

it('downloads an available update', async () => {
  mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
  mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true });
  await expect(checkForOtaUpdate(1_000_000_000, false)).resolves.toBe(true);
});

it('checks at most every 30 minutes', async () => {
  mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
  await checkForOtaUpdate(1_000_000_000, false);
  await checkForOtaUpdate(1_000_000_000 + 29 * 60_000, false);
  expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  await checkForOtaUpdate(1_000_000_000 + 31 * 60_000, false);
  expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(2);
});

it('does nothing when updates are off, and swallows errors', async () => {
  mockUpdates.isEnabled = false;
  await expect(checkForOtaUpdate(1_000_000_000, false)).resolves.toBe(false);
  expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();

  mockUpdates.isEnabled = true;
  mockUpdates.checkForUpdateAsync.mockRejectedValue(new Error('offline'));
  await expect(checkForOtaUpdate(2_000_000_000, false)).resolves.toBe(false);
});
