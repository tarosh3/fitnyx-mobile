import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { Card } from '../Card';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    card: '#1B1B1B',
    border: '#2A2A2A',
  }),
}));

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('passes through additional props', () => {
    const { getByTestId } = render(
      <Card testID="my-card">
        <Text>Content</Text>
      </Card>
    );
    expect(getByTestId('my-card')).toBeTruthy();
  });
});
