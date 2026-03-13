import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AtSign, Check, X } from 'lucide-react-native';

import { Input } from '@/src/components/ui/Input';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { checkAndLockUsername, CheckAndLockResponse, getUsernameSuggestions } from '@/src/lib/api/username';
import { OnboardingStepProps } from '@/src/features/onboarding/types';
import { StepScaffold } from '@/src/features/onboarding/steps/StepScaffold';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function UsernameStep({ data, onNext, saving }: OnboardingStepProps) {
  const palette = useThemeColors();

  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [resolving, setResolving] = useState(true);

  const previousUsernameRef = useRef('');
  const debouncedUsername = useDebounce(username, 300);

  // On mount, resolve an available username before showing the form
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const initial = data?.username?.toLowerCase();
      if (!initial) {
        setResolving(false);
        return;
      }

      try {
        const response = await checkAndLockUsername(initial, '');
        if (cancelled) return;

        if (response.available) {
          // Backend username is available — use it directly
          setUsername(initial);
          setResolving(false);
          return;
        }

        // Username is taken — fetch suggestions and auto-pick the first one
        const suggestionsResp = await getUsernameSuggestions(initial);
        if (cancelled) return;

        if (suggestionsResp.suggestions?.length) {
          setUsername(suggestionsResp.suggestions[0]);
        } else {
          // Fallback: show the original so user can manually change
          setUsername(initial);
        }
      } catch {
        if (!cancelled) setUsername(initial);
      } finally {
        if (!cancelled) setResolving(false);
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, []);

  const validateLocally = useCallback((value: string) => {
    if (!value) return { valid: false, error: '' };
    if (value.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
    if (value.length > 30) return { valid: false, error: 'Username must be at most 30 characters' };
    if (!/^[a-z0-9._]+$/.test(value.toLowerCase())) return { valid: false, error: 'Only letters, numbers, dots and underscores allowed' };
    if (value.startsWith('.')) return { valid: false, error: 'Cannot start with a dot' };
    if (value.endsWith('.')) return { valid: false, error: 'Cannot end with a dot' };
    if (value.includes('..')) return { valid: false, error: 'Cannot have consecutive dots' };
    return { valid: true, error: '' };
  }, []);

  useEffect(() => {
    // Don't run debounced checks until initial resolution is done
    if (resolving) return;

    if (!debouncedUsername) {
      setStatus('idle');
      setError('');
      setSuggestions([]);
      setIsLocked(false);
      return;
    }

    const local = validateLocally(debouncedUsername);
    if (!local.valid) {
      setStatus('invalid');
      setError(local.error);
      setSuggestions([]);
      setIsLocked(false);
      return;
    }

    const checkUsername = async () => {
      setStatus('checking');
      setError('');

      try {
        const response: CheckAndLockResponse = await checkAndLockUsername(
          debouncedUsername.toLowerCase(),
          previousUsernameRef.current
        );

        if (response.error) {
          setStatus('invalid');
          setError(response.error);
          setIsLocked(false);
          return;
        }

        if (response.available) {
          setStatus('available');
          setIsLocked(response.locked);
          previousUsernameRef.current = debouncedUsername.toLowerCase();
          setSuggestions([]);
        } else {
          setStatus('taken');
          setIsLocked(false);
          setSuggestions(response.suggestions || []);
        }
      } catch {
        setStatus('invalid');
        setError('Failed to check username');
        setIsLocked(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, validateLocally, resolving]);

  const canContinue = status === 'available' && isLocked && !saving;

  const indicator = (() => {
    if (status === 'checking') return <ActivityIndicator size="small" color={palette.mutedText} />;
    if (status === 'available') return <Check size={18} color={palette.success} />;
    if (status === 'taken' || status === 'invalid') return <X size={18} color={palette.destructive} />;
    return null;
  })();

  if (resolving) {
    return (
      <StepScaffold
        title="Choose your username"
        subtitle="This is how others will find you on FitNyx."
        onContinue={() => {}}
        disabled
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.mutedText }]}>Finding the perfect username for you…</Text>
        </View>
      </StepScaffold>
    );
  }

  return (
    <StepScaffold
      title="Choose your username"
      subtitle="This is how others will find you on FitNyx."
      onContinue={() => onNext({ username: username.toLowerCase() })}
      saving={saving}
      disabled={!canContinue}
      error={status === 'invalid' ? error : undefined}
    >
      <View style={styles.inputWrap}>
        <View style={styles.leftIcon}>
          <AtSign size={18} color={palette.mutedText} />
        </View>
        <Input
          value={username}
          onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          placeholder="username"
          style={styles.input}
        />
        <View style={styles.rightIndicator}>{indicator}</View>
      </View>

      {status === 'available' && isLocked ? (
        <Text style={[styles.msg, { color: palette.success }]}>✓ @{username} is available and reserved for you</Text>
      ) : null}
      {status === 'taken' ? <Text style={[styles.msg, { color: palette.destructive }]}>✗ @{username} is already taken</Text> : null}

      {suggestions.length ? (
        <View style={styles.suggestions}>
          <Text style={[styles.suggestionLabel, { color: palette.mutedText }]}>Try one of these:</Text>
          <View style={styles.suggestionChips}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setUsername(suggestion)}
                style={[styles.suggestionChip, { borderColor: palette.border, backgroundColor: palette.card }]}
              >
                <Text style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>@{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.rules, { borderColor: palette.border, backgroundColor: `${palette.card}CC` }]}> 
        <Text style={{ color: palette.mutedText, fontSize: 12, lineHeight: 19 }}>
          <Text style={{ color: palette.text, fontWeight: '700' }}>Username rules:</Text>{'\n'}
          • 3-30 characters{`\n`}
          • Letters, numbers, dots, underscores only{`\n`}
          • Cannot start/end with dot
        </Text>
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    justifyContent: 'center',
    position: 'relative',
  },
  leftIcon: {
    left: 14,
    position: 'absolute',
    zIndex: 2,
  },
  input: {
    paddingLeft: 40,
    paddingRight: 38,
  },
  rightIndicator: {
    position: 'absolute',
    right: 12,
  },
  msg: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  suggestions: {
    marginTop: 6,
  },
  suggestionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rules: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    padding: 12,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
