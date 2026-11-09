import { Check, Crown } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ShareCardData } from '@/src/features/share/cardData';
import { CARD_SIZE, ShareCard, type CardFormat, type ShareTemplate } from '@/src/features/share/ShareCard';
import type { RemoteTemplate } from '@/src/features/share/remote/schema';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

export interface LookOption { value: ShareTemplate; label: string; design?: RemoteTemplate }

/** Live thumbnails of every look (built-in and published) in the current format. */
export function LookPicker({ looks, active, data, format, photoUri, disabled, onSelect, isLocked }: {
  looks: LookOption[];
  active: ShareTemplate;
  data: ShareCardData | null;
  format: CardFormat;
  photoUri: string | null;
  disabled: boolean;
  onSelect: (value: ShareTemplate) => void;
  /** A Pro look on the free plan: a crown on its thumbnail. */
  isLocked?: (look: LookOption) => boolean;
}) {
  const c = useThemeColors();
  const { width, height } = CARD_SIZE[format];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.looks}>
      {looks.map((t) => {
        const on = t.value === active;
        return (
          <Pressable
            key={t.value}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${t.label} style`}
            accessibilityState={{ selected: on, disabled }}
            onPress={() => onSelect(t.value)}
            style={styles.look}
          >
            <View style={[styles.thumbnailFrame, { borderColor: on ? c.primary : c.border }]}>
              <View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[styles.thumbnail, { height: (72 * height) / width, backgroundColor: c.share.sticker.checkB }]}
              >
                {data ? (
                  <View style={{ width, height, transform: [{ scale: 72 / width }], transformOrigin: 'top left' }}>
                    <ShareCard data={data} format={format} template={t.value} design={t.design} photoUri={photoUri} />
                  </View>
                ) : null}
              </View>
              {isLocked?.(t) ? (
                <View style={[styles.selected, { backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.primary }]} accessibilityLabel="Pro design">
                  <Crown size={11} strokeWidth={2.5} color={c.accent} />
                </View>
              ) : null}
              {on ? (
                <View style={[styles.selected, { backgroundColor: c.primary }]}>
                  <Check size={11} strokeWidth={3} color={c.primaryText} />
                </View>
              ) : null}
            </View>
            <Text
              style={[styles.lookLabel, { color: on ? c.text : c.mutedText, fontFamily: on ? type.weight.bold : type.weight.medium }]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  looks: { gap: 12, paddingBottom: 4 },
  look: { alignItems: 'center', gap: 6 },
  thumbnailFrame: { padding: 3, borderRadius: 8, borderWidth: 2 },
  thumbnail: { width: 72, height: 90, overflow: 'hidden', borderRadius: 3 },
  selected: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookLabel: { fontSize: 11 },
});
