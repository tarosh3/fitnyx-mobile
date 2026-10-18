import { Download, Share2 } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import type { ShareCardData } from '@/src/features/share/cardData';
import { CARD_SIZE, ShareCard, type CardFormat } from '@/src/features/share/ShareCard';
import { captureCard, saveCardImage, shareCardImage } from '@/src/features/share/shareImage';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';

const FORMATS: { label: string; value: CardFormat }[] = [
  { label: 'Story', value: 'story' },
  { label: 'Post', value: 'post' },
];
/** Preview height inside the sheet; the card itself stays full size for capture. */
const PREVIEW_H = 380;

interface Props {
  visible: boolean;
  data: ShareCardData | null;
  onClose: () => void;
}

/** Preview the achievement card, pick a format, then share it or save it to Photos. */
export function ShareCardSheet({ visible, data, onClose }: Props) {
  const c = useThemeColors();
  const cardRef = useRef<View>(null);
  // Shown in the sheet: the app's toasts render underneath its modal.
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [format, setFormat] = useState<CardFormat>('story');
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const { width, height } = CARD_SIZE[format];
  const scale = PREVIEW_H / height;

  const run = async (action: 'share' | 'save') => {
    setBusy(action);
    setNotice(null);
    try {
      const uri = await captureCard(cardRef, format);
      if (action === 'share') {
        await shareCardImage(uri, data?.title ?? '');
      } else if ((await saveCardImage(uri)) === 'saved') {
        setNotice({ text: 'Saved to Photos ✓' });
      } else {
        setNotice({ text: 'Allow FitNyx to add photos in Settings', error: true });
        Linking.openSettings().catch(() => undefined);
      }
    } catch {
      setNotice({ text: action === 'share' ? 'Couldn’t share the image' : 'Couldn’t save the image', error: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="Share your achievement"
      subtitle="Post it to your story or save it to Photos"
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button
            variant="secondary"
            title="Save"
            icon={<Download size={20} color={c.text} />}
            onPress={() => void run('save')}
            loading={busy === 'save'}
            disabled={!data || busy !== null}
          />
          <Button
            title="Share"
            icon={<Share2 size={20} color={c.primaryText} />}
            onPress={() => void run('share')}
            loading={busy === 'share'}
            disabled={!data || busy !== null}
          />
        </View>
      }
    >
      <SegmentedControl
        options={FORMATS}
        value={format}
        onChange={(f) => {
          setFormat(f);
          setNotice(null);
        }}
      />
      {data ? (
        <View style={[styles.preview, { width: width * scale, height: PREVIEW_H }]}>
          {/* Scaled for display only — the capture draws the card at full size. */}
          <View style={{ width, height, transform: [{ scale }], transformOrigin: 'top left' }}>
            <ShareCard ref={cardRef} data={data} format={format} />
          </View>
        </View>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: notice.error ? c.destructive : c.accent }]}>
          {notice.text}
        </Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12 },
  preview: { alignSelf: 'center', marginTop: 16, borderRadius: 18, overflow: 'hidden' },
  notice: { textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: 12 },
});
