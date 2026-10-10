import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { Button } from '@/src/components/ui/Button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { InviteRedeemForm } from '@/src/features/invite/InviteRedeemForm';
import { useAuth } from '@/src/providers/AuthProvider';

export default function InviteScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { user, loading, signOut } = useAuth();
  // Deliberate sign-out clears `user` while this screen is still mounted —
  // without the flag the !user bounce below flashes /login before signOut's
  // own navigation to the landing screen wins.
  const [signingOut, setSigningOut] = React.useState(false);

  // The redeem call needs a Supabase JWT — without one, back to login.
  useEffect(() => {
    if (!loading && !user && !signingOut) {
      router.replace('/login');
    }
  }, [loading, user, signingOut]);

  const handleSignOut = () => {
    setSigningOut(true);
    signOut().catch(() => setSigningOut(false));
  };

  return (
    <Screen scroll={false} contentContainerStyle={styles.center}>
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={styles.emoji}>🎟️</Text>
        <Text style={[styles.title, { color: palette.text }]}>FitNyx is invite-only</Text>
        <Text style={[styles.subtitle, { color: palette.mutedText }]}>
          Enter your invite code to get started. Don&apos;t have one? Ask the person who invited you.
        </Text>
        <InviteRedeemForm submitLabel="Enter FitNyx" />
        <Button title="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    width: '100%',
  },
  emoji: {
    fontSize: 42,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
});
