import AsyncStorage from '@react-native-async-storage/async-storage';

import { getGoalMl, setGoalMl } from '@/src/lib/water';

beforeEach(() => AsyncStorage.clear());

it("follows the plan's water target until the user sets a goal", async () => {
  expect(await getGoalMl()).toBe(2500);
  expect(await getGoalMl(2600)).toBe(2600);
  await setGoalMl(3000);
  expect(await getGoalMl(2600)).toBe(3000);
});
