import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PhotoMealScreen } from '@/src/features/diet/photo/PhotoMealScreen';
import { photoErrorKind, photoLogItems, photoMealName, resizeFor } from '@/src/features/diet/photo/model';
import { analyzeMealPhoto, createDietLog, type PhotoMealItem } from '@/src/lib/api/diet';
import { isDefinitelyOffline } from '@/src/lib/network';

const mockDismiss = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, dismiss: mockDismiss, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.light }));
jest.mock('@/src/lib/network', () => ({ isDefinitelyOffline: jest.fn() }));
jest.mock('@/src/features/diet/photo/pick', () => ({ photoForUpload: jest.fn(async () => 'BASE64'), pickMealPhoto: jest.fn() }));
jest.mock('@/src/lib/api/diet', () => ({ analyzeMealPhoto: jest.fn(), createDietLog: jest.fn() }));

const roti: PhotoMealItem = { food_id: 1, name: 'Roti, whole wheat', portion_label: '2 rotis', grams: 80, kcal: 212, protein_g: 6.8, carbs_g: 36, fat_g: 5, is_veg: true, confidence: 'high' };
const dal: PhotoMealItem = { food_id: null, name: 'Dal makhani', portion_label: '1 katori', grams: 150, kcal: 260, protein_g: 9, carbs_g: 24, fat_g: 14, is_veg: true, confidence: 'low' };
const result = { name: 'Dal roti', items: [roti, dal], note: 'Butter in the dal would add more.' };
const httpError = (status: number, code?: string) => Object.assign(new Error('x'), { status, code });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { uri: 'file:///meal.jpg', date: '2026-11-09', slot: 'lunch' };
  (isDefinitelyOffline as jest.Mock).mockResolvedValue(false);
  (analyzeMealPhoto as jest.Mock).mockResolvedValue(result);
  (createDietLog as jest.Mock).mockImplementation(async (input) => input);
});

describe('photo model', () => {
  it('maps errors to what the user can do', () => {
    expect(photoErrorKind(new Error('Network request failed'))).toBe('offline');
    expect(photoErrorKind(httpError(429, 'daily_limit'))).toBe('limit');
    expect(photoErrorKind(httpError(429))).toBe('busy');
    expect(photoErrorKind(httpError(422, 'no_food'))).toBe('no_food');
    expect(photoErrorKind(httpError(502))).toBe('failed');
  });

  it('shrinks only big photos, on the longest side', () => {
    expect(resizeFor(4032, 3024)).toEqual({ width: 1024 });
    expect(resizeFor(3024, 4032)).toEqual({ height: 1024 });
    expect(resizeFor(800, 600)).toBeNull();
    expect(resizeFor(0, 0)).toBeNull();
  });

  it('logs kept foods with their amount and names the meal', () => {
    const kept = photoLogItems([roti, dal], [1.5, null]);
    expect(kept).toEqual([{ food_id: 1, name: 'Roti, whole wheat', portion_label: '2 rotis', qty: 1.5, kcal: 212, protein_g: 6.8, carbs_g: 36, fat_g: 5, is_veg: true }]);
    expect(photoMealName('Dal roti', [roti, dal], kept)).toBe('Roti, whole wheat');
    expect(photoMealName('Dal roti', [roti, dal], photoLogItems([roti, dal], [1, 1]))).toBe('Dal roti');
    expect(photoMealName('  ', [roti], photoLogItems([roti], [1]))).toBe('Roti, whole wheat');
  });
});

describe('PhotoMealScreen', () => {
  it('reads the photo, lets the user drop a food, and logs the rest', async () => {
    render(<PhotoMealScreen />);
    expect(screen.getByText('Reading your plate…')).toBeOnTheScreen();
    expect(await screen.findByText('Dal roti')).toBeOnTheScreen();
    expect(analyzeMealPhoto).toHaveBeenCalledWith('BASE64', '');
    expect(screen.getByText(/Unsure · 1 katori · 150 g/)).toBeOnTheScreen();
    expect(screen.getByText(/Butter in the dal would add more/)).toBeOnTheScreen();
    expect(screen.getByText('Add 2 items · 472 kcal to Lunch')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Remove Dal makhani'));
    fireEvent.press(screen.getByText('Add 1 item · 212 kcal to Lunch'));
    await waitFor(() => expect(mockDismiss).toHaveBeenCalledWith(2));
    expect(createDietLog).toHaveBeenCalledWith(expect.objectContaining({
      local_date: '2026-11-09', slot: 'lunch', source: 'food', name: 'Roti, whole wheat',
      items: [expect.objectContaining({ food_id: 1, qty: 1, kcal: 212 })],
    }));
  });

  it('reads again with the user’s note', async () => {
    render(<PhotoMealScreen />);
    await screen.findByText('Dal roti');
    fireEvent.press(screen.getByText(/Not quite right/));
    fireEvent.changeText(screen.getByLabelText('Describe the meal'), ' 3 rotis ');
    fireEvent.press(screen.getByText('Read again'));
    await waitFor(() => expect(analyzeMealPhoto).toHaveBeenLastCalledWith('BASE64', '3 rotis'));
  });

  it('explains the daily limit without offering a retry', async () => {
    (analyzeMealPhoto as jest.Mock).mockRejectedValue(httpError(429, 'daily_limit'));
    render(<PhotoMealScreen />);
    expect(await screen.findByText('That’s today’s photos')).toBeOnTheScreen();
    expect(screen.queryByText('Try again')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Search instead'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('doesn’t call the server offline, and retries when back', async () => {
    (isDefinitelyOffline as jest.Mock).mockResolvedValueOnce(true);
    render(<PhotoMealScreen />);
    expect(await screen.findByText('No connection')).toBeOnTheScreen();
    expect(analyzeMealPhoto).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Dal roti')).toBeOnTheScreen();
  });
});
