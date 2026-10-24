import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, ScrollView } from 'react-native';

const mockSend = jest.fn();
const mockLoad = jest.fn();
const mockToggle = jest.fn();
const mockHistory = jest.fn();
const mockNew = jest.fn();
const mockSwitch = jest.fn();
const mockArchive = jest.fn();
let mockOnline = true;
let mockLoading = false;
let mockHistoryOpen = false;
let mockMessages: { role: 'user' | 'assistant'; content: string }[] = [];

jest.mock('@/src/providers/AICoachProvider', () => ({
  useAICoach: () => ({
    threads: [{ id: 'one', title: 'My training', last_message_at: new Date().toISOString() }],
    currentThreadId: 'one', currentThreadTitle: 'My training', messages: mockMessages,
    isOpen: true, isLoading: mockLoading, isThreadListOpen: mockHistoryOpen,
    toggleChat: mockToggle, sendMessage: mockSend, startNewChat: mockNew,
    switchThread: mockSwitch, archiveCurrentThread: mockArchive,
    toggleThreadList: mockHistory, loadThreads: mockLoad,
  }),
}));
jest.mock('@/src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: mockOnline }) }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }) }));

import { AICoachChat } from '../AICoachChat';

beforeEach(() => {
  jest.clearAllMocks();
  mockOnline = true;
  mockLoading = false;
  mockHistoryOpen = false;
  mockMessages = [];
  mockSend.mockResolvedValue(undefined);
});

test('sends a trimmed draft and immediately prevents duplicate sends during thread creation', async () => {
  let resolve!: () => void;
  mockSend.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
  const screen = render(<AICoachChat />);
  fireEvent.changeText(screen.getByLabelText('Message Filo'), '  Help me train  ');
  fireEvent.press(screen.getByLabelText('Send message'));
  fireEvent.press(screen.getByLabelText('Send message'));
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledWith('Help me train');
  expect(screen.getByLabelText('Message Filo')).toHaveProp('value', '');
  expect(screen.getByLabelText('Start new chat')).toBeDisabled();
  await act(async () => resolve());
});

test('conversation starters submit the original coaching question', async () => {
  const screen = render(<AICoachChat />);
  await act(async () => fireEvent.press(screen.getByText('Fuel my day')));
  expect(mockSend).toHaveBeenCalledWith('Quick high-protein meal idea?');
});

test('offline mode keeps drafts editable while disabling network actions', () => {
  mockOnline = false;
  const screen = render(<AICoachChat />);
  fireEvent.changeText(screen.getByLabelText('Message Filo'), 'Save my draft');
  fireEvent.press(screen.getByLabelText('Send message'));
  fireEvent.press(screen.getByText('Fuel my day'));
  expect(mockSend).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Message Filo')).toHaveProp('value', 'Save my draft');
  expect(screen.getByLabelText('Start new chat')).toBeDisabled();
  expect(screen.getByText('You’re offline. Reconnect to chat with Filo.')).toBeTruthy();
});

test('history replaces the composer and preserves thread selection and archive actions', () => {
  mockHistoryOpen = true;
  const screen = render(<AICoachChat />);
  expect(screen.queryByLabelText('Message Filo')).toBeNull();
  fireEvent.press(screen.getByText('My training'));
  expect(mockSwitch).toHaveBeenCalledWith('one');
  fireEvent.press(screen.getByLabelText('Archive current chat'));
  expect(mockArchive).toHaveBeenCalledTimes(1);
});

test('shows a return-to-latest action while reading earlier messages', () => {
  mockMessages = [{ role: 'user', content: 'Help me train' }];
  const screen = render(<AICoachChat />);
  fireEvent.scroll(screen.UNSAFE_getByType(ScrollView), { nativeEvent: {
    contentOffset: { y: 0 }, contentSize: { height: 1400 }, layoutMeasurement: { height: 500 },
  } });
  expect(screen.getByLabelText('Jump to latest message')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Jump to latest message'));
  expect(screen.queryByLabelText('Jump to latest message')).toBeNull();
});

test('closing the coach dismisses the keyboard', () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  const screen = render(<AICoachChat />);
  fireEvent.press(screen.getByLabelText('Close coach'));
  expect(dismiss).toHaveBeenCalled();
  expect(mockToggle).toHaveBeenCalledTimes(1);
  dismiss.mockRestore();
});
