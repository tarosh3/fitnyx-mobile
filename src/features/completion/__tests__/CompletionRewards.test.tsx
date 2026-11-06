import React from 'react';
import { render } from '@testing-library/react-native';

import { CompletionRewards } from '../CompletionRewards';

jest.mock('@/src/features/appConfig/store', () => ({ useAppConfig: () => null }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));

it('shows what was earned, with the medal', () => {
  const view = render(<CompletionRewards screen="roam" xp={78} />);
  expect(view.getByText('+78 XP')).toBeOnTheScreen();
  expect(view.getByText('Added to your progress')).toBeOnTheScreen();
  expect(view.UNSAFE_queryAllByType(require('react-native').Image).length).toBeGreaterThan(0);
});

it('gives no medal to a Roam that earned nothing', () => {
  const view = render(<CompletionRewards screen="roam" xp={0} eligible={false} />);
  expect(view.getByText('Roam recorded')).toBeOnTheScreen();
  expect(view.getByText('This one didn’t earn XP')).toBeOnTheScreen();
  expect(view.UNSAFE_queryAllByType(require('react-native').Image).length).toBe(0);
});

it('shows the streak only when there is one to show', () => {
  expect(render(<CompletionRewards screen="workout" xp={300} streak={3} />).getByText('3 days')).toBeOnTheScreen();
  expect(render(<CompletionRewards screen="roam" xp={300} />).queryByText('Current streak')).not.toBeOnTheScreen();
});
