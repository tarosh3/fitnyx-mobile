import AsyncStorage from '@react-native-async-storage/async-storage';

const mockDisplay = jest.fn();
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { displayNotification: (...a: unknown[]) => mockDisplay(...a), createChannel: jest.fn() },
  AndroidImportance: { HIGH: 4 },
}));

import type { RoamStats } from '../geo';
import { checkGoalMilestones, getGoalTracker, milestoneMessage, startGoalTracker } from '../goalTracker';

const stats = (distanceM: number, steps: number | null = null): RoamStats => ({
  distanceM, movingTimeSec: 1800, avgSpeedMps: 0, maxSpeedMps: 0, avgPaceSecPerKm: null, vehicleDistanceM: 0,
  vehicleDetected: false, inVehicleNow: false, xpEligible: true, route: [], vehicleRanges: [], splits: [], steps,
});

const base = {
  clientId: 'roam-1', type: 'run' as const, weightKg: 70,
  goals: [{ kind: 'distance' as const, target: 5000 }, { kind: 'steps' as const, target: 6000 }],
  before: { distanceM: 1000, kcal: 0, steps: 0 },
};

beforeEach(async () => {
  mockDisplay.mockClear();
  await AsyncStorage.clear();
});

it('announces halfway, then done, each only once', async () => {
  await startGoalTracker(base);
  await checkGoalMilestones('roam-1', stats(1000)); // 2 of 5 km today
  expect(mockDisplay).not.toHaveBeenCalled();
  await checkGoalMilestones('roam-1', stats(1600)); // 2.6 km: halfway
  await checkGoalMilestones('roam-1', stats(1700));
  expect(mockDisplay).toHaveBeenCalledTimes(1);
  expect(mockDisplay.mock.calls[0][0]).toMatchObject({ title: 'Halfway to your distance goal' });
  await checkGoalMilestones('roam-1', stats(4100)); // 5.1 km: done
  expect(mockDisplay).toHaveBeenCalledTimes(2);
  expect(mockDisplay.mock.calls[1][0]).toMatchObject({ title: 'Distance goal reached', body: '5.1 km today. Nice work!' });
});

it('doesn’t re-announce what the day reached before this Roam', async () => {
  await startGoalTracker({ ...base, before: { distanceM: 6000, kcal: 0, steps: 0 } });
  await checkGoalMilestones('roam-1', stats(500));
  expect(mockDisplay).not.toHaveBeenCalled();
});

it('ignores a different recording', async () => {
  await startGoalTracker(base);
  expect(await getGoalTracker('roam-2')).toBeNull();
  await checkGoalMilestones('roam-2', stats(4500));
  expect(mockDisplay).not.toHaveBeenCalled();
});

it('words the halfway message with the target', () => {
  expect(milestoneMessage('steps', 'half', 6000, 3100)).toEqual({ title: 'Halfway to your steps goal', body: '3,100 steps of 6,000 steps today. Keep going.' });
});
