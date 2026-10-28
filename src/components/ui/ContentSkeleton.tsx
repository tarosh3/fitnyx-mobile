import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/src/styles/tokens';
import { Skeleton } from './Skeleton';

/** Shared content-shaped placeholders; one accessible loading announcement. */
export function ContentSkeleton({ label, variant = 'card', testID }: {
  label: string; variant?: 'card' | 'list' | 'progress'; testID?: string;
}) {
  return (
    <View testID={testID} accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityState={{ busy: true }} style={styles.stack}>
      {variant === 'list' ? [0, 1, 2].map((row) => (
        <View key={row} style={styles.row}>
          <Skeleton width={48} height={48} radius={radii.md} />
          <View style={styles.copy}><Skeleton width="68%" height={18} /><Skeleton width="44%" height={14} /></View>
        </View>
      )) : (
        <>
          <Skeleton width="34%" height={14} />
          <Skeleton width="72%" height={variant === 'progress' ? 44 : 24} />
          <Skeleton width="88%" height={16} />
          <Skeleton height={variant === 'progress' ? 150 : 48} radius={radii.lg} />
          {variant === 'progress' && <View style={styles.row}><Skeleton style={styles.tile} height={88} /><Skeleton style={styles.tile} height={88} /></View>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.base, paddingVertical: spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  copy: { flex: 1, gap: spacing.sm },
  tile: { flex: 1 },
});
