import { ChevronRight, Ghost, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/src/features/roam/components/ActivityRow';
import { formatDistance, formatDuration } from '@/src/features/roam/geo';
import type { GhostTarget } from '@/src/features/roam/ghost';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { ActivitySummary } from '@/src/lib/api/activities';
import { radii, spacing, type } from '@/src/styles/tokens';

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** On the Roam screen: "Race a past Roam", or the ghost picked (with ✕). */
export function RaceRow({ ghost, onOpen, onClear }: { ghost: GhostTarget | null; onOpen: () => void; onClear: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" testID="race-row"
      accessibilityLabel={ghost ? `Racing ${ghost.title}. Change` : 'Race a past Roam'}
      style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: ghost ? c.primary : c.border }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.icon, { backgroundColor: c.surface }]}>
        <Ghost size={18} color={c.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {ghost ? `Racing ${ghost.title}` : 'Race a past Roam'}
        </Text>
        <Text style={[styles.sub, { color: c.mutedText }]} numberOfLines={1}>
          {ghost
            ? `${shortDate(ghost.startedAt)} · ${formatDistance(ghost.distanceM)} in ${formatDuration(ghost.movingSec)}`
            : 'Chase your own time, live as you go'}
        </Text>
      </View>
      {ghost ? (
        <Pressable onPress={onClear} hitSlop={12} accessibilityRole="button" accessibilityLabel="Stop racing" style={styles.clear}>
          <X size={18} color={c.mutedText} />
        </Pressable>
      ) : (
        <ChevronRight size={18} color={c.mutedText} />
      )}
    </Pressable>
  );
}

interface SheetProps {
  visible: boolean;
  candidates: ActivitySummary[];
  /** The Roam being loaded after a tap. */
  loadingId: string | null;
  error: string | null;
  onPick: (a: ActivitySummary) => void;
  onClose: () => void;
}

/** Past Roams of the same kind; the one picked runs beside you as a ghost. */
export function RaceSheet({ visible, candidates, loadingId, error, onPick, onClose }: SheetProps) {
  const c = useThemeColors();
  return (
    <Sheet visible={visible} title="Race a past Roam" subtitle="Your ghost moves at the pace you did it. Stops don't count for either of you." onClose={onClose}>
      {/* Toasts draw under the sheet, so problems show here. */}
      {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
      {candidates.length === 0 ? (
        <Text style={[styles.empty, { color: c.mutedText }]}>No Roams to race yet. Save one of at least 200 m and it shows up here.</Text>
      ) : (
        <View style={styles.list}>
          {candidates.slice(0, 30).map((a) => (
            <View key={a.id}>
              <ActivityRow activity={a} onPress={loadingId ? undefined : () => onPick(a)} />
              {loadingId === a.id ? <ActivityIndicator style={styles.spinner} color={c.primary} /> : null}
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 16, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 12, minHeight: 56 },
  icon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: type.weight.semibold, fontSize: 15 },
  sub: { fontFamily: type.weight.regular, fontSize: 12 },
  clear: { padding: 4 },
  list: { gap: 10 },
  spinner: { position: 'absolute', right: 48, top: 0, bottom: 0 },
  empty: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', paddingVertical: spacing.lg },
  error: { fontFamily: type.weight.semibold, fontSize: 13, textAlign: 'center', marginBottom: spacing.sm },
});
