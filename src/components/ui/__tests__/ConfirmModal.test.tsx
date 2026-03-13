import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ConfirmModal } from '../ConfirmModal';

jest.mock('@/src/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    card: '#1B1B1B',
    border: '#2A2A2A',
    text: '#F5F5F5',
    mutedText: '#A1A1AA',
    primary: '#5fc793',
    destructive: '#EF4444',
  }),
}));

describe('ConfirmModal', () => {
  const defaultProps = {
    visible: true,
    title: 'Delete Item',
    message: 'Are you sure you want to delete this?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows title and message when visible', () => {
    const { getByText } = render(<ConfirmModal {...defaultProps} />);
    expect(getByText('DELETE ITEM')).toBeTruthy(); // title is uppercased
    expect(getByText('Are you sure you want to delete this?')).toBeTruthy();
  });

  it('calls onConfirm when confirm button is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ConfirmModal {...defaultProps} onConfirm={onConfirm} />
    );
    fireEvent.press(getByText('CONFIRM'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <ConfirmModal {...defaultProps} onCancel={onCancel} />
    );
    fireEvent.press(getByText('CANCEL'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('hides cancel button when showCancel=false', () => {
    const { queryByText } = render(
      <ConfirmModal {...defaultProps} showCancel={false} />
    );
    expect(queryByText('CANCEL')).toBeNull();
  });

  it('uses custom confirm and cancel labels', () => {
    const { getByText } = render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
      />
    );
    expect(getByText('YES, DELETE')).toBeTruthy(); // uppercased
    expect(getByText('NO, KEEP')).toBeTruthy();
  });

  it('renders danger variant', () => {
    // Just verify it renders without crashing
    const { getByText } = render(
      <ConfirmModal {...defaultProps} variant="danger" />
    );
    expect(getByText('DELETE ITEM')).toBeTruthy();
  });

  it('renders primary variant', () => {
    const { getByText } = render(
      <ConfirmModal {...defaultProps} variant="primary" />
    );
    expect(getByText('DELETE ITEM')).toBeTruthy();
  });
});
