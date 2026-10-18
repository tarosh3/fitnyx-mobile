import * as ImagePicker from 'expo-image-picker';
import { Download, ImagePlus, Share2 } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import type { ShareCardData } from '@/src/features/share/cardData';
import { CARD_SIZE, ShareCard, TEMPLATES, type CardFormat, type ShareTemplate } from '@/src/features/share/ShareCard';
import { captureCard, saveCardImage, shareCardImage } from '@/src/features/share/shareImage';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

const FORMATS: { label: string; value: CardFormat }[] = [
  { label: 'Story', value: 'story' },
  { label: 'Post', value: 'post' },
];
/** Preview height inside the sheet; the card itself stays full size for capture. */
const PREVIEW_H = 360;

interface Props {
  visible: boolean;
  data: ShareCardData | null;
  onClose: () => void;
}

/** Pick a look and a format, then share the card or save it to Photos. */
export function ShareCardSheet({ visible, data, onClose }: Props) {
  const c = useThemeColors();
  const cardRef = useRef<View>(null);
  const [template, setTemplate] = useState<ShareTemplate>('glow');
  const [format, setFormat] = useState<CardFormat>('story');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  // Shown in the sheet: the app's toasts render underneath its modal.
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const { width, height } = CARD_SIZE[format];
  const scale = PREVIEW_H / height;
  const needsPhoto = template === 'photo' && !photoUri;
  const templates = data ? TEMPLATES[data.kind] : [];

  const pickPhoto = async () => {
    // The system photo picker: no library permission needed on iOS or Android.
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }).catch(() => null);
    if (res && !res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

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
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button
            variant="secondary"
            title="Save"
            icon={<Download size={20} color={c.text} />}
            onPress={() => void run('save')}
            loading={busy === 'save'}
            disabled={!data || needsPhoto || busy !== null}
          />
          <Button
            title="Share"
            icon={<Share2 size={20} color={c.primaryText} />}
            onPress={() => void run('share')}
            loading={busy === 'share'}
            disabled={!data || needsPhoto || busy !== null}
          />
        </View>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {templates.map((t) => {
          const on = t.value === template;
          return (
            <Pressable
              key={t.value}
              onPress={() => {
                setTemplate(t.value);
                setNotice(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}
            >
              <Text style={[styles.chipText, { color: on ? c.primaryText : c.text }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <SegmentedControl options={FORMATS} value={format} onChange={setFormat} />

      {data ? (
        <View style={[styles.preview, { width: width * scale, height: PREVIEW_H }]}>
          {template === 'sticker' ? <Checker color={c.share.sticker} width={width * scale} height={PREVIEW_H} /> : null}
          {/* Scaled for display only — the capture draws the card at full size (and without the checkerboard). */}
          <View style={{ width, height, transform: [{ scale }], transformOrigin: 'top left' }}>
            <ShareCard ref={cardRef} data={data} format={format} template={template} photoUri={photoUri} />
          </View>
        </View>
      ) : null}

      {template === 'photo' ? (
        <Pressable onPress={() => void pickPhoto()} accessibilityRole="button" style={[styles.photoBtn, { borderColor: c.border }]}>
          <ImagePlus size={18} color={c.text} />
          <Text style={[styles.photoText, { color: c.text }]}>{photoUri ? 'Change photo' : 'Choose photo'}</Text>
        </Pressable>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: notice.error ? c.destructive : c.accent }]}>
          {notice.text}
        </Text>
      ) : null}
    </Sheet>
  );
}

/** Transparency checkerboard behind the sticker preview (never captured). */
function Checker({ color, width, height }: { color: { checkA: string; checkB: string }; width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="chk" width={16} height={16} patternUnits="userSpaceOnUse">
          <Rect width={16} height={16} fill={color.checkA} />
          <Rect width={8} height={8} fill={color.checkB} />
          <Rect x={8} y={8} width={8} height={8} fill={color.checkB} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#chk)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12 },
  chips: { gap: 8, paddingBottom: 12 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  chipText: { fontFamily: type.weight.semibold, fontSize: 14 },
  preview: { alignSelf: 'center', marginTop: 14, borderRadius: 18, overflow: 'hidden' },
  photoBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, marginTop: 12 },
  photoText: { fontFamily: type.weight.semibold, fontSize: 14 },
  notice: { textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: 12 },
});
