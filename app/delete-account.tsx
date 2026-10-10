import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useAuth } from '@/src/providers/AuthProvider';
import { _suppressAuthFailureRedirect } from '@/src/lib/api';
import { deleteAccount } from '@/src/lib/api/users';

export default function DeleteAccountScreen() {
  const palette = useThemeColors();
  const { signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    setError(null);
    try {
      // Deletion revokes all backend sessions; concurrent in-flight calls (e.g.
      // WorkoutProvider's poll) then 401 with SESSION_REVOKED. Suppress the
      // global auth-failure redirect so it can't race signOut() and land the
      // user on /login with a "logged in elsewhere" notice.
      _suppressAuthFailureRedirect();
      await deleteAccount();
      // Account is now scheduled for deletion (30-day grace) and all backend
      // sessions are revoked; signOut purges local data and routes to the
      // landing screen. Fall back to a plain redirect rather than stranding
      // the user here if sign-out throws.
      try {
        await signOut();
      } catch {
        router.replace('/');
      }
    } catch {
      // Deletion failed — the session is still live, so re-arm the redirect.
      _suppressAuthFailureRedirect(false);
      setDeleting(false);
      setError('Could not delete your account. Check your connection and try again, or email support@fitnyx.in.');
    }
  };

  return (
    <Screen>
      <PageHeader title="Delete Account & Data" subtitle="Permanently remove your account" backTo="/settings" />

      <Card style={{ gap: 12 }}>
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: palette.destructive }]}>Delete your account</Text>
          <Text style={[styles.sectionBody, { color: palette.mutedText }]}>
            Your account is deactivated immediately and permanently deleted after 30 days. Changed your mind? Just log back in within 30 days to cancel.
          </Text>
        </View>

        <View style={[styles.notice, { borderColor: palette.border, backgroundColor: `${palette.card}DD` }]}>
          <Text style={{ color: palette.text, fontSize: 12, fontWeight: '700' }}>What gets deleted after 30 days</Text>
          <Text style={{ color: palette.mutedText, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
            Profile information, workout plans, workout logs, nutrition plans, body metrics, and AI chat history tied to your account.
          </Text>
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: palette.destructive }]}>{error}</Text>
        ) : null}

        <Button
          title={deleting ? 'Deleting…' : 'Delete My Account'}
          variant="danger"
          loading={deleting}
          disabled={deleting}
          onPress={() => setConfirmOpen(true)}
        />
      </Card>

      <Card style={{ gap: 12, marginTop: 16 }}>
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Signed up with Facebook?</Text>
          <Text style={[styles.sectionBody, { color: palette.mutedText }]}>
            You can also remove FitNyx from Facebook Settings → Apps and Websites to revoke its access.
          </Text>
          <Button
            title="Open Facebook App Settings"
            variant="secondary"
            onPress={() => Linking.openURL('https://www.facebook.com/settings?tab=applications')}
          />
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: palette.primary }]}>Need help?</Text>
          <Text style={[styles.sectionBody, { color: palette.mutedText }]}>
            Email support@fitnyx.in if you have trouble deleting your account or want a copy of your data first.
          </Text>
          <Button
            title="Email Support"
            variant="secondary"
            onPress={() =>
              Linking.openURL(
                'mailto:support@fitnyx.in?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20FitNyx%20account%20and%20all%20associated%20data.'
              )
            }
          />
        </View>
      </Card>

      <ConfirmModal
        visible={confirmOpen}
        title="Delete account?"
        message="You'll be signed out now and your account will be permanently deleted in 30 days. Logging back in before then cancels the deletion."
        confirmLabel="DELETE MY ACCOUNT"
        cancelLabel="KEEP MY ACCOUNT"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
