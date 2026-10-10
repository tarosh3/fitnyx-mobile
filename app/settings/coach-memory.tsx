import { useRouter } from 'expo-router';
import { Brain, ChevronLeft, Save } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getAIProfile, updateAIProfile } from '@/src/lib/api/agent';
import { sanitizeGeneralText } from '@/src/lib/validators';

const MAX_WORDS = 120;
const MAX_CHARS = 1000; // generous char limit, server enforces word count

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CoachMemoryScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const [note, setNote] = useState('');
  const [originalNote, setOriginalNote] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const wordCount = countWords(note);
  const isOverLimit = wordCount > MAX_WORDS;
  const hasChanges = note !== originalNote;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getAIProfile();
      const currentNote = profile.manual_memory_note || '';
      setNote(currentNote);
      setOriginalNote(currentNote);
      setLastUpdated(profile.manual_memory_updated_at);
    } catch (error) {
      console.warn('Failed to load AI profile', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (isOverLimit) {
      Alert.alert('Too many words', `Please keep your note under ${MAX_WORDS} words.`);
      return;
    }
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const profile = await updateAIProfile(note.trim());
      const savedNote = profile.manual_memory_note || '';
      setOriginalNote(savedNote);
      setNote(savedNote);
      setLastUpdated(profile.manual_memory_updated_at);
      Alert.alert('Saved', 'Your coach memory has been updated. Filo will reflect this in your next conversation.');
    } catch (error: any) {
      const msg = error?.data?.error || 'Failed to save. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [note, isOverLimit, hasChanges]);

  const styles = React.useMemo(() => getStyles(palette), [palette]);

  if (isLoading) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          style={styles.backButton}
        >
          <ChevronLeft color={palette.text} size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Coach Memory</Text>
          <Text style={styles.headerSubtitle}>WHAT FILO REMEMBERS ABOUT YOU</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Brain color={palette.primary} size={20} />
        <Text style={styles.infoText}>
          This note helps Filo remember things about you across conversations — like injuries,
          dietary preferences, schedule constraints, or personal goals. Keep it concise.
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          multiline
          numberOfLines={8}
          placeholder="e.g. I have a bad left knee, avoid heavy squats. I'm vegetarian. I can only train Mon/Wed/Fri mornings..."
          placeholderTextColor={palette.mutedText}
          style={[
            styles.textArea,
            isOverLimit && { borderColor: '#EF4444' },
          ]}
          value={note}
          onChangeText={(v) => setNote(sanitizeGeneralText(v, MAX_CHARS))}
          maxLength={MAX_CHARS}
          textAlignVertical="top"
        />
        <View style={styles.counterRow}>
          <Text style={[styles.counterText, isOverLimit && { color: '#EF4444' }]}>
            {wordCount}/{MAX_WORDS} words
          </Text>
          {lastUpdated && (
            <Text style={styles.updatedText}>
              Last saved: {new Date(lastUpdated).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={isSaving || !hasChanges || isOverLimit}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: hasChanges && !isOverLimit ? palette.primary : palette.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={palette.primaryText} />
        ) : (
          <>
            <Save color={palette.primaryText} size={18} />
            <Text style={styles.saveText}>Save</Text>
          </>
        )}
      </Pressable>
    </Screen>
  );
}

const getStyles = (palette: any) =>
  StyleSheet.create({
    screenContent: {
      paddingBottom: 40,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: palette.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '900',
      color: palette.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 10,
      fontWeight: '800',
      color: palette.mutedText,
      letterSpacing: 2,
      marginTop: 4,
    },
    infoCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: `${palette.primary}11`,
      borderWidth: 1,
      borderColor: `${palette.primary}22`,
      marginBottom: 24,
      alignItems: 'flex-start',
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      color: palette.mutedText,
    },
    inputContainer: {
      marginBottom: 24,
    },
    textArea: {
      backgroundColor: palette.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      fontSize: 14,
      lineHeight: 22,
      minHeight: 180,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    counterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingHorizontal: 4,
    },
    counterText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.mutedText,
    },
    updatedText: {
      fontSize: 11,
      color: palette.mutedText,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      borderRadius: 16,
      gap: 8,
    },
    saveText: {
      // Dark-on-mint matches Button's primary variant; white on #5fc793 is ~1.9:1 contrast.
      color: palette.primaryText,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });
