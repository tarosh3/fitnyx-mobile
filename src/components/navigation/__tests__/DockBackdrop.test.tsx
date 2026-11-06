import { BlurView } from 'expo-blur';
import React from 'react';
import { render } from '@testing-library/react-native';

import { DockBackdrop } from '../DockBackdrop';
import { BOTTOM_NAV_HEIGHT, bottomNavGap, dockBackdropHeight } from '../bottomNavLayout';

jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));

describe('DockBackdrop', () => {
  it('blurs what is under the dock, without taking touches', () => {
    const view = render(<DockBackdrop height={44} reduceTransparency={false} />);
    expect(view.UNSAFE_queryAllByType(BlurView).length).toBeGreaterThan(0);
    const wrap = view.getByTestId('dock-backdrop', { includeHiddenElements: true });
    expect(wrap.props.pointerEvents).toBe('none');
  });

  it('uses the colour wash alone with Reduce Transparency', () => {
    const view = render(<DockBackdrop height={44} reduceTransparency />);
    expect(view.UNSAFE_queryAllByType(BlurView).length).toBe(0);
    expect(view.getByTestId('dock-backdrop', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('dock spacing', () => {
  it.each([0, 20, 34])('at inset %d, the blur stays below the top of the pill', (inset) => {
    expect(dockBackdropHeight(inset)).toBeLessThan(bottomNavGap(inset) + BOTTOM_NAV_HEIGHT);
    expect(dockBackdropHeight(inset)).toBeGreaterThan(bottomNavGap(inset));
  });
});
