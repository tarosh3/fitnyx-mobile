import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { File as FsFile } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  Mail,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Field } from '@/src/components/ui/Field';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getProfile, updateProfile } from '@/src/lib/api/users';
import { checkAndLockUsername, claimUsername } from '@/src/lib/api/username';
import { countries } from '@/src/lib/countries';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { elevation, radii, spacing, type as t } from '@/src/styles/tokens';

const BIO_LIMIT = 150;

type Gender = 'male' | 'female' | 'other';

type UsernameStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken'; suggestions: string[] }
  | { state: 'invalid'; error: string };

export default function ProfileScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, avatarUrl: authAvatarUrl } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dob, setDob] = useState<Date | null>(null);

  // ui state
  const [showCountry, setShowCountry] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarUri, setAvatarUri] = useState('');
  const [newAvatarLocalUri, setNewAvatarLocalUri] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ state: 'idle' });

  const debouncedUsername = useDebouncedValue(username.trim(), 400);
  const reqIdRef = useRef(0);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === countryCode) || countries[0],
    [countryCode]
  );

  useEffect(() => {
    if (authLoading || !user) return;
    loadProfile();
  }, [authLoading, user]);

  // live username check
  useEffect(() => {
    const trimmed = debouncedUsername;
    if (!trimmed || trimmed.toLowerCase() === originalUsername.trim().toLowerCase()) {
      setUsernameStatus({ state: 'idle' });
      return;
    }
    if (trimmed.length < 3) {
      setUsernameStatus({ state: 'invalid', error: 'At least 3 characters' });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameStatus({ state: 'invalid', error: 'Letters, numbers, and _ only' });
      return;
    }

    const reqId = ++reqIdRef.current;
    setUsernameStatus({ state: 'checking' });
    checkAndLockUsername(trimmed, originalUsername)
      .then((res) => {
        if (reqId !== reqIdRef.current) return; // stale
        if (res.available && res.locked) {
          setUsernameStatus({ state: 'available' });
        } else {
          setUsernameStatus({ state: 'taken', suggestions: res.suggestions ?? [] });
        }
      })
      .catch(() => {
        if (reqId !== reqIdRef.current) return;
        setUsernameStatus({ state: 'invalid', error: 'Could not verify' });
      });
  }, [debouncedUsername, originalUsername]);

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
      setBio(profile?.bio || '');
      setEmail(user.email || '');
      setAvatarUri(profile?.avatar_url || authAvatarUrl || metadata.avatar_url || '');
      setGender((profile?.gender as Gender) || (metadata.gender as Gender) || '');
      if (profile?.dob) setDob(new Date(profile.dob));

      if (fullPhone.startsWith('+')) {
        const sortedCodes = countries.map((country) => country.code).sort((a, b) => b.length - a.length);
        const matchedCode = sortedCodes.find((code) => fullPhone.startsWith(code));
        if (matchedCode) {
          setCountryCode(matchedCode);
          setPhone(fullPhone.slice(matchedCode.length));
        } else {
          setCountryCode('+91');
          setPhone(fullPhone.replace(/^\+/, ''));
        }
      } else {
        setPhone(fullPhone || '');
      }
    } catch (err) {
      console.error('Failed to load profile', err);
      setMessage({ type: 'error', text: 'Failed to load profile.' });
    } finally {
      setLoading(false);
    }
  };

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setMessage({ type: 'error', text: 'Photo permission required.' });
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
    } catch (err) {
      console.error('Failed to process image', err);
      setMessage({ type: 'error', text: 'Failed to process image.' });
    }
  };

  const uploadAvatar = async () => {
    if (!newAvatarLocalUri || !user) return null;
    setUploading(true);
    try {
      const filePath = `avatars/${user.id}-${Date.now()}.jpg`;
      // RN+Android: fetch(uri).blob() returns 0-byte blobs intermittently.
      // Use the expo-file-system File class which reads the file natively and
      // returns a real ArrayBuffer.
      const fileHandle = new FsFile(newAvatarLocalUri);
      const arrayBuffer = await fileHandle.arrayBuffer();
      const { error } = await supabase.storage.from('profiles').upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    if (usernameStatus.state === 'checking') return;
    if (usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') {
      setMessage({ type: 'error', text: 'Fix username before saving.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const usernameChanged = username.trim().toLowerCase() !== originalUsername.trim().toLowerCase();
      if (usernameChanged && username.trim()) {
        // Status already verified above; still safe to claim
        await claimUsername(username.trim());
      }

      let nextAvatar = avatarUri;
      if (newAvatarLocalUri) {
        const uploaded = await uploadAvatar();
        if (uploaded) {
          nextAvatar = uploaded;
          setAvatarUri(uploaded);
        }
      }

      const normalizedPhone = phone ? `${countryCode}${phone.replace(/[^0-9]/g, '')}` : '';

      await updateProfile({
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: normalizedPhone,
        avatar_url: nextAvatar,
        bio,
        gender: gender || undefined,
        dob: dob ? dob.toISOString() : undefined,
      });

      await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: normalizedPhone,
          avatar_url: nextAvatar,
        },
      });

      setOriginalUsername(username.trim());
      setNewAvatarLocalUri(null);
      setMessage({ type: 'success', text: 'Profile saved.' });
    } catch (err: any) {
      console.error('Failed to save profile', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  // ----- render -----

  if (authLoading || loading) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: c.background,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.flexCenter, { backgroundColor: c.background }]}>
        <Text style={{ color: c.text }}>Please sign in.</Text>
      </View>
    );
  }

  const bioLeft = BIO_LIMIT - bio.length;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <PressableScale
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
              style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <ChevronLeft size={22} color={c.text} />
            </PressableScale>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: c.mutedText }]}>ACCOUNT</Text>
              <Text style={[styles.h1, { color: c.text }]}>Edit Profile</Text>
            </View>
          </View>

          {message ? (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor: message.type === 'success' ? `${c.success}22` : `${c.destructive}22`,
                  borderColor: message.type === 'success' ? c.success : c.destructive,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: message.type === 'success' ? c.success : c.destructive },
                ]}
              >
                {message.text}
              </Text>
            </View>
          ) : null}

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={selectImage} style={[styles.avatarRing, { borderColor: c.primary }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: c.surface }]}>
                  <Camera size={32} color={c.primary} strokeWidth={1.6} />
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: c.primary }]}>
                <Camera size={14} color={c.primaryText} strokeWidth={2} />
              </View>
            </Pressable>
            <Text style={[styles.changePhotoText, { color: c.primary }]}>
              {uploading ? 'Uploading…' : 'Tap to change photo'}
            </Text>
          </View>

          {/* PERSONAL */}
          <SectionHeader eyebrow="Personal" />
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Field
              label="Username"
              value={username}
              onChangeText={(v) => setUsername(v.replace(/\s/g, ''))}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect={false}
              error={
                usernameStatus.state === 'invalid'
                  ? usernameStatus.error
                  : usernameStatus.state === 'taken'
                    ? 'Username taken'
                    : undefined
              }
              helper={
                usernameStatus.state === 'available'
                  ? '✓ Available'
                  : usernameStatus.state === 'idle' && username
                    ? 'This is your current username'
                    : undefined
              }
              trailing={<UsernameIndicator status={usernameStatus} c={c} />}
            />
            {usernameStatus.state === 'taken' && usernameStatus.suggestions.length > 0 ? (
              <View style={styles.suggestRow}>
                <Text style={[styles.suggestLabel, { color: c.mutedText }]}>Try:</Text>
                {usernameStatus.suggestions.slice(0, 3).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setUsername(s)}
                    style={[styles.suggestChip, { borderColor: c.primary, backgroundColor: `${c.primary}1A` }]}
                  >
                    <Text style={[styles.suggestChipText, { color: c.primary }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>GENDER</Text>
              <SegmentedControl<Gender>
                options={[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                  { label: 'Other', value: 'other' },
                ]}
                value={(gender || 'male') as Gender}
                onChange={setGender}
              />
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>DATE OF BIRTH</Text>
              <PressableScale
                onPress={() => setShowDatePicker(true)}
                style={[styles.fauxField, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                <Calendar size={18} color={c.mutedText} strokeWidth={1.8} />
                <Text style={[styles.fauxFieldText, { color: dob ? c.text : c.mutedText }]}>
                  {dob ? dob.toLocaleDateString() : 'Select date'}
                </Text>
              </PressableScale>
              {showDatePicker ? (
                <DateTimePicker
                  value={dob ?? new Date(1995, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    if (Platform.OS !== 'ios') setShowDatePicker(false);
                    if (event.type === 'set' && date) setDob(date);
                  }}
                />
              ) : null}
              {Platform.OS === 'ios' && showDatePicker ? (
                <Pressable onPress={() => setShowDatePicker(false)} style={{ alignSelf: 'flex-end' }}>
                  <Text style={[styles.fieldLabel, { color: c.primary }]}>DONE</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* BIO */}
          <SectionHeader eyebrow="Bio" />
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>ABOUT YOU</Text>
              <View
                style={[
                  styles.bioBox,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <TextInput
                  value={bio}
                  onChangeText={(v) => v.length <= BIO_LIMIT && setBio(v)}
                  placeholder="A short intro — goals, motivation, anything"
                  placeholderTextColor={c.mutedText}
                  multiline
                  textAlignVertical="top"
                  style={[styles.bioInput, { color: c.text }]}
                  maxLength={BIO_LIMIT}
                />
                <Text style={[styles.bioCounter, { color: bioLeft < 20 ? c.warning : c.mutedText }]}>
                  {bio.length}/{BIO_LIMIT}
                </Text>
              </View>
            </View>
          </View>

          {/* CONTACT */}
          <SectionHeader eyebrow="Contact" />
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Field
              label="Email"
              value={email}
              editable={false}
              leading={<Mail size={16} color={c.mutedText} strokeWidth={1.8} />}
              helper="Email change is managed via Supabase verification"
            />

            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>PHONE</Text>
              <View style={styles.row}>
                <PressableScale
                  onPress={() => setShowCountry(true)}
                  style={[styles.countryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                >
                  <Text style={{ fontSize: 22 }}>{selectedCountry.flag}</Text>
                  <Text style={[styles.countryCode, { color: c.text }]}>{selectedCountry.code}</Text>
                </PressableScale>
                <View style={{ flex: 1 }}>
                  <Field
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 96 }} />
        </ScrollView>

        {/* Sticky Save */}
        <View style={[styles.saveBar, { backgroundColor: c.background, borderColor: c.border }]}>
          <Button
            title={saving ? 'Saving…' : 'Save Profile'}
            onPress={save}
            loading={saving}
            disabled={saving || usernameStatus.state === 'checking'}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Country picker modal */}
      <Modal visible={showCountry} transparent animationType="slide" onRequestClose={() => setShowCountry(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowCountry(false)} />
        <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Select Country</Text>
            <Pressable onPress={() => setShowCountry(false)}>
              <Text style={[styles.sheetDone, { color: c.primary }]}>Done</Text>
            </Pressable>
          </View>
          <Picker
            selectedValue={countryCode}
            onValueChange={(v) => setCountryCode(String(v))}
            style={Platform.OS === 'ios' ? undefined : { color: c.text }}
            itemStyle={{ color: c.text }}
          >
            {countries.map((country) => (
              <Picker.Item
                key={`${country.iso}-${country.code}`}
                label={`${country.flag}  ${country.name}  ${country.code}`}
                value={country.code}
              />
            ))}
          </Picker>
        </View>
      </Modal>
    </View>
  );
}

function UsernameIndicator({
  status,
  c,
}: {
  status: UsernameStatus;
  c: ReturnType<typeof useThemeColors>;
}) {
  switch (status.state) {
    case 'checking':
      return <ActivityIndicator size="small" color={c.mutedText} />;
    case 'available':
      return <Check size={18} color={c.success} strokeWidth={2.4} />;
    case 'taken':
      return <X size={18} color={c.destructive} strokeWidth={2.4} />;
    case 'invalid':
      return <AlertCircle size={18} color={c.destructive} strokeWidth={2.4} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  flexCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: t.weight.extrabold,
    fontSize: t.size.h1,
    letterSpacing: t.tracking.tight,
    marginTop: 2,
  },
  messageBox: {
    marginHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  messageText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2.5,
    padding: 4,
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  changePhotoText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.sm,
  },
  card: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  fauxField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fauxFieldText: {
    fontFamily: t.weight.medium,
    fontSize: t.size.body,
  },
  bioBox: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    minHeight: 110,
  },
  bioInput: {
    fontFamily: t.weight.regular,
    fontSize: t.size.body,
    minHeight: 80,
  },
  bioCounter: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.eyebrow,
    alignSelf: 'flex-end',
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  suggestLabel: {
    fontFamily: t.weight.medium,
    fontSize: t.size.xs,
  },
  suggestChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  suggestChipText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  countryCode: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.body,
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing['2xl'] : spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontFamily: t.weight.bold,
    fontSize: t.size.h3,
  },
  sheetDone: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.body,
  },
});
