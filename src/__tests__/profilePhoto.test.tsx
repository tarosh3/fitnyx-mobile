import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '@/app/profile';
import { uploadAvatar } from '@/src/lib/avatarUpload';
import { getProfile, updateProfile } from '@/src/lib/api/users';
import { manipulateAsync } from 'expo-image-manipulator';

const mockProfileUpdated = jest.fn();
const mockUpdateUser = jest.fn(() => Promise.resolve({ data: {}, error: null }));
const OLD = 'https://res.cloudinary.com/demo/image/upload/v1791990000/avatars/user-1.jpg';
const NEW = 'https://res.cloudinary.com/demo/image/upload/v1791990500/avatars/user-1.jpg';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@react-native-picker/picker', () => ({ Picker: Object.assign(() => null, { Item: () => null }) }));
// Animation wrappers aren't under test; plain stand-ins keep Reanimated out of this suite.
jest.mock('@/src/components/ui/PressableScale', () => {
  const { Pressable } = require('react-native');
  return { PressableScale: Pressable };
});
jest.mock('@/src/components/ui/SegmentedControl', () => ({ SegmentedControl: () => null }));
jest.mock('@/src/hooks/useThemeColors', () => ({ useThemeColors: () => require('@/src/theme/colors').colors.dark }));
jest.mock('@/src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ isOnline: true }) }));
// One stable object, like the real context: a new `user` each render would re-run the load effect forever.
const mockAuth = {
  user: { id: 'user-1', email: 'a@b.c', user_metadata: {} },
  loading: false, avatarUrl: OLD, userProfile: null, profileUpdated: (p: unknown) => mockProfileUpdated(p),
};
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/src/lib/supabase', () => ({ supabase: { auth: { updateUser: (...a: unknown[]) => mockUpdateUser(...(a as [])) } } }));
jest.mock('@/src/lib/api/users', () => ({ getProfile: jest.fn(), updateProfile: jest.fn() }));
jest.mock('@/src/lib/api/username', () => ({ checkAndLockUsername: jest.fn(() => Promise.resolve({ available: true })), claimUsername: jest.fn() }));
jest.mock('@/src/lib/avatarUpload', () => ({ uploadAvatar: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file:///picked.heic' }] })),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'file:///resized.jpg' })),
  SaveFormat: { JPEG: 'jpeg' },
}));

const profile = { id: 'user-1', email: 'a@b.c', username: 'tarosh', first_name: 'Tarosh', avatar_url: OLD, onboarding_complete: true, subscription_tier: 'free' };

describe('changing the profile photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProfile as jest.Mock).mockResolvedValue(profile);
    (uploadAvatar as jest.Mock).mockResolvedValue(NEW);
    (updateProfile as jest.Mock).mockImplementation(async (data) => ({ ...profile, ...data }));
  });

  it('uploads the resized photo, saves the new URL and updates every screen', async () => {
    const screen = render(<ProfileScreen />);
    const change = await screen.findByLabelText('Change profile photo');

    await act(async () => { fireEvent.press(change); });
    expect(manipulateAsync).toHaveBeenCalledWith('file:///picked.heic', [{ resize: { width: 256, height: 256 } }], { compress: 0.8, format: 'jpeg' });

    await act(async () => { fireEvent.press(screen.getByText('Save Profile')); });

    await waitFor(() => expect(mockProfileUpdated).toHaveBeenCalled());
    expect(uploadAvatar).toHaveBeenCalledWith('file:///resized.jpg');
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: NEW }));
    expect(mockProfileUpdated).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: NEW }));
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: expect.objectContaining({ avatar_url: NEW }) });
    expect(await screen.findByText('Profile saved.')).toBeTruthy();
  });

  it('keeps the old photo and says so when the upload fails', async () => {
    (uploadAvatar as jest.Mock).mockRejectedValue(Object.assign(new Error('Photo uploads are not available right now'), { status: 503 }));
    const screen = render(<ProfileScreen />);
    const change = await screen.findByLabelText('Change profile photo');
    await act(async () => { fireEvent.press(change); });
    await act(async () => { fireEvent.press(screen.getByText('Save Profile')); });

    await waitFor(() => expect(uploadAvatar).toHaveBeenCalled());
    expect(updateProfile).not.toHaveBeenCalled();
    expect(mockProfileUpdated).not.toHaveBeenCalled();
    expect(await screen.findByText('Photo uploads are not available right now')).toBeTruthy();
  });

  it('saves other changes without uploading when the photo is unchanged', async () => {
    const screen = render(<ProfileScreen />);
    await screen.findByLabelText('Change profile photo');
    await act(async () => { fireEvent.press(screen.getByText('Save Profile')); });

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: OLD })));
    expect(uploadAvatar).not.toHaveBeenCalled();
  });
});
