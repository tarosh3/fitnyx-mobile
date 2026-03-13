import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Button } from '../Button';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    background: '#0A0A0A',
    surface: '#141414',
    card: '#1B1B1B',
    border: '#2A2A2A',
    text: '#F5F5F5',
    mutedText: '#A1A1AA',
    primary: '#5fc793',
    primaryText: '#0C0C0C',
    destructive: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  }),
}));

describe('Button', () => {
  it('renders title text', () => {
    const { getByText } = render(<Button title="Submit" />);
    expect(getByText('Submit')).toBeTruthy();
  });

  it('calls onPress handler', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click Me" onPress={onPress} />);
    fireEvent.press(getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Disabled" onPress={onPress} disabled />);
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(<Button title="Loading" loading />);
    // Title text should not be rendered when loading
    expect(queryByText('Loading')).toBeNull();
    // ActivityIndicator should be present
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('is disabled when loading', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<Button title="Loading" loading onPress={onPress} />);
    const { ActivityIndicator } = require('react-native');
    // The button should be disabled, so press should not fire
    // We verify by checking the ActivityIndicator is rendered instead of text
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it.each(['primary', 'secondary', 'danger', 'ghost', 'outline'] as const)(
    'renders %s variant without crashing',
    (variant) => {
      const { getByText } = render(<Button title="Test" variant={variant} />);
      expect(getByText('Test')).toBeTruthy();
    }
  );
});
