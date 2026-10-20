import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { DietGoalsSheet } from '../today/DietGoalsSheet';

const plan = { kcal: 2210, protein: 160, carbs: 220, fat: 66 };
const goals = (diet_kcal: number | null, diet_protein_g: number | null) =>
  ({ daily_distance_m: null, daily_burn_kcal: null, daily_steps: null, diet_kcal, diet_protein_g, weight_kg: 80 });

it('starts a switched-on goal at the plan’s number and saves it', async () => {
  const onSave = jest.fn().mockResolvedValue({});
  const onClose = jest.fn();
  render(<DietGoalsSheet visible plan={plan} goals={goals(null, null)} onSave={onSave} onClose={onClose} />);
  expect(screen.queryByText('Use my plan’s goals')).not.toBeOnTheScreen();
  fireEvent(screen.getByLabelText('Calories goal'), 'valueChange', true);
  fireEvent.press(screen.getByLabelText('More Calories')); // 2,200 → 2,250
  fireEvent.press(screen.getByTestId('diet-goals-save'));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(onSave).toHaveBeenCalledWith({ diet_kcal: 2250, diet_protein_g: null });
});

it('goes back to the plan’s goals', async () => {
  const onSave = jest.fn().mockResolvedValue({});
  render(<DietGoalsSheet visible plan={plan} goals={goals(2500, 180)} onSave={onSave} onClose={jest.fn()} />);
  fireEvent.press(screen.getByText('Use my plan’s goals'));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ diet_kcal: null, diet_protein_g: null }));
});

it('shows a save error inside the sheet', async () => {
  const onSave = jest.fn().mockRejectedValue(new Error('You’re offline. Goals save once you’re connected.'));
  render(<DietGoalsSheet visible plan={plan} goals={goals(2500, null)} onSave={onSave} onClose={jest.fn()} />);
  fireEvent.press(screen.getByTestId('diet-goals-save'));
  expect(await screen.findByText('You’re offline. Goals save once you’re connected.')).toBeOnTheScreen();
});
