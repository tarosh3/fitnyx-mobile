import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Picker } from '@react-native-picker/picker';

import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { countries } from '@/src/lib/countries';
import { getProfile, updateProfile } from '@/src/lib/api/users';
import { checkAndLockUsername, claimUsername } from '@/src/lib/api/username';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';

export default function ProfileScreen() {
  const palette = useThemeColors();
  const { user, loading: authLoading, avatarUrl: authAvatarUrl } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');

  const [avatarUri, setAvatarUri] = useState('');
  const [newAvatarLocalUri, setNewAvatarLocalUri] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    loadProfile();
  }, [authLoading, user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      let profile: any = null;
      try {
        profile = await getProfile();
      } catch {
        profile = null;
      }

      const metadata = user.user_metadata || {};
      const fullPhone = profile?.phone || metadata.phone || '';

      const loadedUsername = profile?.username || metadata.username || '';
      setUsername(loadedUsername);
      setOriginalUsername(loadedUsername);
      setFirstName(profile?.first_name || metadata.first_name || '');
      setLastName(profile?.last_name || metadata.last_name || '');
      setEmail(user.email || '');
      setAvatarUri(profile?.avatar_url || authAvatarUrl || metadata.avatar_url || '');

      if (fullPhone.startsWith('+')) {
        const sortedCodes = countries.map((country) => country.code).sort((a, b) => b.length - a.length);
        const matchedCode = sortedCodes.find((code) => fullPhone.startsWith(code));

        if (matchedCode) {
          setCountryCode(matchedCode);
          setPhone(fullPhone.slice(matchedCode.length));
        } else {
          setCountryCode('+1');
          setPhone(fullPhone.replace(/^\+/, ''));
        }
      } else {
        setCountryCode('+1');
        setPhone(fullPhone || '');
      }
    } catch (profileError) {
      console.error('Failed to load profile', profileError);
      setMessage({ type: 'error', text: 'Failed to load profile.' });
    } finally {
      setLoading(false);
    }
  };

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setMessage({ type: 'error', text: 'Photo permission is required to update avatar.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    try {
      const processed = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.85, format: SaveFormat.JPEG }
      );
      setNewAvatarLocalUri(processed.uri);
      setAvatarUri(processed.uri);
    } catch (processError) {
      console.error('Failed to process image', processError);
      setMessage({ type: 'error', text: 'Failed to process image.' });
    }
  };

  const uploadAvatar = async () => {
    if (!newAvatarLocalUri || !user) return null;

    setUploading(true);
    try {
      const filePath = `avatars/${user.id}-${Date.now()}.jpg`;
      const response = await fetch(newAvatarLocalUri);
      const blob = await response.blob();

      const { error } = await supabase.storage.from('profiles').upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (uploadError) {
      console.error('Failed to upload avatar', uploadError);
      throw uploadError;
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);
    setUsernameError(null);

    try {
      // If username changed, validate via lock/claim flow
      const usernameChanged = username.trim().toLowerCase() !== originalUsername.trim().toLowerCase();
      if (usernameChanged && username.trim()) {
        const lockResult = await checkAndLockUsername(username.trim(), originalUsername);
        if (!lockResult.available || !lockResult.locked) {
          const hint = lockResult.suggestions?.length
            ? ` Try: ${lockResult.suggestions.slice(0, 3).join(', ')}`
            : '';
          setUsernameError(lockResult.error || `Username "${username}" is not available.${hint}`);
          setSaving(false);
          return;
        }
      }

      let nextAvatar = avatarUri;
      if (newAvatarLocalUri) {
        const uploaded = await uploadAvatar();
        if (uploaded) {
          nextAvatar = uploaded;
          setAvatarUri(uploaded);
        }
      }

      const normalizedPhone = `${countryCode}${phone.replace(/[^0-9]/g, '')}`;

      // If username changed, claim it (completes the lock→claim flow, writes to DB + cleans up Redis)
      if (usernameChanged && username.trim()) {
        await claimUsername(username.trim());
      }

      // Write to backend first — only update Supabase metadata if backend succeeds.
      // This prevents divergence if the backend rejects the change.
      await updateProfile({
        username: username.trim(),
        first_name: firstName,
        last_name: lastName,
        phone: normalizedPhone,
        avatar_url: nextAvatar,
      });

      await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          first_name: firstName,
          last_name: lastName,
          phone: normalizedPhone,
          avatar_url: nextAvatar,
        },
      });

      setOriginalUsername(username.trim());
      setNewAvatarLocalUri(null);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (saveError: any) {
      console.error('Failed to save profile', saveError);
      setMessage({ type: 'error', text: saveError?.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  const countryItems = useMemo(
    () =>
      countries.map((country) => (
        <Picker.Item key={`${country.iso}-${country.code}`} label={`${country.flag} ${country.code}`} value={country.code} />
      )),
    []
  );

  if (authLoading || loading) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: palette.background, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <Screen scroll={false} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ width: '100%' }}>
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>Please log in to edit profile.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Edit Profile" subtitle="Update your account details" backTo="/settings" />

      {message ? (
        <View
          style={[
            styles.messageBox,
            {
              borderColor: message.type === 'success' ? '#22C55E55' : '#EF444466',
              backgroundColor: message.type === 'success' ? '#22C55E22' : '#EF444422',
            },
          ]}
        >
          <Text style={{ color: message.type === 'success' ? '#22C55E' : '#EF4444', fontSize: 12, fontWeight: '700' }}>
            {message.text}
          </Text>
        </View>
      ) : null}

      <Card style={{ gap: 12 }}>
        <View style={styles.avatarSection}>
          <Pressable onPress={selectImage} style={[styles.avatarWrap, { borderColor: palette.border, backgroundColor: palette.card }]}> 
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <Text style={{ color: palette.mutedText, fontSize: 11, fontWeight: '700' }}>ADD PHOTO</Text>
            )}
          </Pressable>
          <Button title={uploading ? 'Uploading...' : 'Change Photo'} variant="secondary" onPress={selectImage} loading={uploading} />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: palette.text }]}>First Name</Text>
            <Input value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: palette.text }]}>Last Name</Text>
            <Input value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" />
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: palette.text }]}>Username</Text>
          <Input
            value={username}
            onChangeText={(v) => { setUsername(v); setUsernameError(null); }}
            placeholder="Username"
            autoCapitalize="none"
          />
          {usernameError ? (
            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600', marginTop: 4 }}>{usernameError}</Text>
          ) : null}
        </View>

        <View>
          <Text style={[styles.label, { color: palette.text }]}>Email</Text>
          <Input value={email} editable={false} style={{ opacity: 0.7 }} />
        </View>

        <View>
          <Text style={[styles.label, { color: palette.text }]}>Phone</Text>
          <View style={styles.row}>
            <View style={[styles.countryWrap, { borderColor: palette.border, backgroundColor: palette.card }]}> 
              <Picker selectedValue={countryCode} onValueChange={(value) => setCountryCode(String(value))} style={{ color: palette.text }}>
                {countryItems}
              </Picker>
            </View>
            <View style={{ flex: 1 }}>
              <Input
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/[^0-9]/g, ''))}
                keyboardType="phone-pad"
                placeholder="Phone number"
              />
            </View>
          </View>
        </View>

        <Button title={saving ? 'Saving...' : 'Save Profile'} onPress={save} loading={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  messageBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 110,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 110,
  },
  avatar: {
    height: '100%',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  countryWrap: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 0.55,
    justifyContent: 'center',
    minHeight: 48,
    overflow: 'hidden',
  },
});
