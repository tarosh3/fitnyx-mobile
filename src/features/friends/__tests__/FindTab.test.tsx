import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockSearch = jest.fn();
const mockSend = jest.fn();
let mockOffline = false;
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn(), useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
jest.mock('@/src/lib/network', () => ({ isDefinitelyOffline: () => Promise.resolve(mockOffline) }));
jest.mock('@/src/lib/api/friends', () => ({
  searchUsers: (q: string) => mockSearch(q),
  sendFriendRequest: (id: string) => mockSend(id),
}));

import { applyFriendChange } from '../data';
import { FindTab } from '../ui/FindTab';

const kapil = { id: 'u1', username: 'kapil', name: null, avatar_url: '', relationship: 'none' as const };

beforeEach(() => {
  mockOffline = false;
  mockSearch.mockReset().mockResolvedValue([kapil]);
  mockSend.mockReset().mockResolvedValue('request_sent');
});

it('searches as the user types and shows the new state after Add', async () => {
  const onChange = jest.fn().mockResolvedValue('request_sent');
  render(<FindTab onChange={onChange} />);
  fireEvent.changeText(screen.getByTestId('friend-search'), '@Kap');
  await waitFor(() => expect(screen.getByText('@kapil')).toBeOnTheScreen());
  expect(mockSearch).toHaveBeenCalledWith('kap');

  fireEvent.press(screen.getByTestId('friend-action-kapil'));
  await waitFor(() => expect(screen.getByLabelText('Requested')).toBeOnTheScreen());
  expect(onChange).toHaveBeenCalledWith('send', expect.objectContaining({ id: 'u1' }));
});

it('never sends a query that can’t be a username', async () => {
  render(<FindTab onChange={jest.fn()} />);
  fireEvent.changeText(screen.getByTestId('friend-search'), 'kapil sharma');
  expect(await screen.findByText('Search by username to add friends.')).toBeOnTheScreen();
  expect(mockSearch).not.toHaveBeenCalled();
});

it('says when no one matches', async () => {
  mockSearch.mockResolvedValue([]);
  render(<FindTab onChange={jest.fn()} />);
  fireEvent.changeText(screen.getByTestId('friend-search'), 'zzz');
  expect(await screen.findByText('No one found for “zzz”.')).toBeOnTheScreen();
});

describe('applyFriendChange', () => {
  it('reports friends when the other user had already asked', async () => {
    mockSend.mockResolvedValue('friends');
    await expect(applyFriendChange('send', 'u1')).resolves.toBe('friends');
  });

  it('turns failures into readable messages', async () => {
    mockSend.mockRejectedValue(Object.assign(new Error('x'), { status: 409, code: 'TOO_MANY_REQUESTS' }));
    await expect(applyFriendChange('send', 'u1')).rejects.toThrow(/too many pending requests/);
    mockOffline = true;
    await expect(applyFriendChange('send', 'u1')).rejects.toThrow(/offline/);
  });
});
