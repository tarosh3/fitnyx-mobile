import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Input } from '../Input';

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
  }),
}));

describe('Input', () => {
  it('renders label text', () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders error message', () => {
    const { getByText } = render(<Input error="Required field" />);
    expect(getByText('Required field')).toBeTruthy();
  });

  it('does not render label when not provided', () => {
    const { queryByText } = render(<Input placeholder="Enter text" />);
    // No label should exist
    expect(queryByText('Email')).toBeNull();
  });

  it('does not render error when not provided', () => {
    const { queryByText } = render(<Input label="Name" />);
    expect(queryByText('Required')).toBeNull();
  });

  it('calls onChangeText with raw value when no sanitizer', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = render(
      <Input onChangeText={onChangeText} defaultValue="" />
    );
    // Simulate text change via testID or placeholder
    const input = getByDisplayValue('');
    fireEvent.changeText(input, 'hello<script>');
    expect(onChangeText).toHaveBeenCalledWith('hello<script>');
  });

  it('applies sanitize function before calling onChangeText', () => {
    const onChangeText = jest.fn();
    const sanitize = (text: string) => text.replace(/[^a-z]/gi, '');

    const { getByDisplayValue } = render(
      <Input onChangeText={onChangeText} sanitize={sanitize} defaultValue="" />
    );

    const input = getByDisplayValue('');
    fireEvent.changeText(input, 'Hello123!@#');
    expect(onChangeText).toHaveBeenCalledWith('Hello');
  });

  it('renders without onChangeText (optional)', () => {
    expect(() => render(<Input label="Test" />)).not.toThrow();
  });
});
