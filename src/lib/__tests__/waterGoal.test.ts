import AsyncStorage from '@react-native-async-storage/async-storage';

import { getGoalMl, setGoalMl, waterPace } from '@/src/lib/water';

beforeEach(() => AsyncStorage.clear());

it("follows the plan's water target until the user sets a goal", async () => {
  expect(await getGoalMl()).toBe(2500);
  expect(await getGoalMl(2600)).toBe(2600);
  await setGoalMl(3000);
  expect(await getGoalMl(2600)).toBe(3000);
});

describe('waterPace', () => {
  const at = (hour: number) => new Date(2026, 10, 4, hour, 0);

  it('is not on track at 10% of the goal late in the evening', () => {
    expect(waterPace(250, 2600, at(20))).toBe('behind');
  });

  it('is on track early in the day, and within the slack later on', () => {
    expect(waterPace(0, 2600, at(6))).toBe('on_track');
    expect(waterPace(250, 2600, at(8))).toBe('on_track');
    expect(waterPace(1300, 2600, at(16))).toBe('on_track');
  });

  it('reports a reached goal at any hour', () => {
    expect(waterPace(2600, 2600, at(9))).toBe('reached');
  });
});
