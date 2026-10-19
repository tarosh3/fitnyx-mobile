import * as ImagePicker from 'expo-image-picker';
import { Check, Download, ImagePlus, Share2 } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import type { ShareCardData } from '@/src/features/share/cardData';
import { CARD_SIZE, ShareCard, TEMPLATES, type CardFormat, type ShareTemplate } from '@/src/features/share/ShareCard';
import { captureCard, saveCardImage, shareCardImage } from '@/src/features/share/shareImage';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, type } from '@/src/styles/tokens';

const FORMATS: { label: string; value: CardFormat }[] = [
  { label: 'Story  ·  9:16', value: 'story' },
  { label: 'Post  ·  4:5', value: 'post' },
];
const LOOK_NOTES: Record<ShareTemplate, string> = {
  glow: 'Big effort. Bold statement.',
  motion: 'Your sport. Its own signature.',
  paper: 'A page from your personal best era.',
  receipt: 'Every effort, on the record.',
  photo: 'Your moment. Your numbers.',
  sticker: 'Transparent PNG · layer it over your story.',
};

interface Props {
  visible: boolean;
  data: ShareCardData | null;
  onClose: () => void;
}

/** A small share studio: real previews, social-safe formats, pinned export actions. */
export function ShareCardSheet({ visible, data, onClose }: Props) {
  const c = useThemeColors();
  const window = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [template, setTemplate] = useState<ShareTemplate>('glow');
  const [format, setFormat] = useState<CardFormat>('story');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const { width, height } = CARD_SIZE[format];
  const previewHeight = Math.min(360, window.height * 0.36, ((window.width - 64) * height) / width);
  const scale = previewHeight / height;
  const needsPhoto = template === 'photo' && (!photoUri || !photoReady);
  const templates = data ? TEMPLATES[data.kind] : [];

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }).catch(() => null);
    if (res && !res.canceled && res.assets[0]) {
      if (res.assets[0].uri !== photoUri) setPhotoReady(false);
      setPhotoUri(res.assets[0].uri);
      setNotice(null);
    }
  };

  const run = async (action: 'share' | 'save') => {
    if (!data || needsPhoto || busy) return;
    setBusy(action);
    setNotice(null);
    try {
      const uri = await captureCard(cardRef, format);
      if (action === 'share') await shareCardImage(uri, data.title);
      else if ((await saveCardImage(uri)) === 'saved') setNotice({ text: 'Saved to Photos' });
      else {
        setNotice({ text: 'Allow FitNyx to add photos in Settings', error: true });
        Linking.openSettings().catch(() => undefined);
      }
    } catch {
      setNotice({
        text: action === 'share' ? 'Couldn’t share the image. Please try again.' : 'Couldn’t save the image. Please try again.',
        error: true,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="Made to be shared."
      subtitle="You put in the work. Own the moment."
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button
            variant="secondary"
            title="Save image"
            icon={<Download size={19} color={c.text} />}
            onPress={() => void run('save')}
            loading={busy === 'save'}
            disabled={!data || needsPhoto || busy !== null}
          />
          <Button
            title="Share"
            icon={<Share2 size={19} color={c.primaryText} />}
            onPress={() => void run('share')}
            loading={busy === 'share'}
            disabled={!data || needsPhoto || busy !== null}
          />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View pointerEvents={busy ? 'none' : 'auto'}>
          <SegmentedControl
            options={FORMATS}
            value={format}
            onChange={(next) => {
              setFormat(next);
              setNotice(null);
            }}
          />
        </View>
        <View style={[styles.stage, { backgroundColor: c.background, borderColor: c.border }]}>
          {data ? (
            <View style={[styles.preview, { width: width * scale, height: previewHeight }]}>
              {template === 'sticker' ? <Checker color={c.share.sticker} width={width * scale} height={previewHeight} /> : null}
              {/* The surrounding stage/checker are outside the capture ref. */}
              <View style={{ width, height, transform: [{ scale }], transformOrigin: 'top left' }}>
                <ShareCard
                  ref={cardRef}
                  data={data}
                  format={format}
                  template={template}
                  photoUri={photoUri}
                  onPhotoLoad={() => setPhotoReady(true)}
                  onPhotoError={() => {
                    setPhotoReady(false);
                    setNotice({ text: 'This photo couldn’t load. Please choose another.', error: true });
                  }}
                />
              </View>
            </View>
          ) : null}
          <Text style={[styles.caption, { color: c.mutedText }]}>{LOOK_NOTES[template]}</Text>
        </View>
        <View style={styles.lookHeader}>
          <Text style={[styles.eyebrow, { color: c.mutedText }]}>CHOOSE YOUR LOOK</Text>
          <Text style={[styles.exportNote, { color: c.mutedText }]}>1080 px PNG</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.looks}>
          {templates.map((t) => {
            const on = t.value === template;
            return (
              <Pressable
                key={t.value}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel={`${t.label} style`}
                accessibilityState={{ selected: on, disabled: busy !== null }}
                onPress={() => {
                  if (t.value === 'photo' && template !== 'photo') setPhotoReady(false);
                  setTemplate(t.value);
                  setNotice(null);
                }}
                style={styles.look}
              >
                <View style={[styles.thumbnailFrame, { borderColor: on ? c.primary : c.border }]}>
                  <View
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[styles.thumbnail, { backgroundColor: c.share.sticker.checkB }]}
                  >
                    {data ? (
                      <View style={{ width: 360, height: 450, transform: [{ scale: 64 / 360 }], transformOrigin: 'top left' }}>
                        <ShareCard data={data} format="post" template={t.value} photoUri={photoUri} />
                      </View>
                    ) : null}
                  </View>
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
        {template === 'photo' ? (
          <Pressable
            disabled={busy !== null}
            onPress={() => void pickPhoto()}
            accessibilityRole="button"
            style={[styles.photoBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <ImagePlus size={18} color={c.text} />
            <Text style={[styles.photoText, { color: c.text }]}>{photoUri ? 'Change photo' : 'Add your photo'}</Text>
          </Pressable>
        ) : null}
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: notice.error ? c.destructive : c.accent }]}>
            {notice.text}
          </Text>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

function Checker({ color, width, height }: { color: { checkA: string; checkB: string }; width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="share-checker" width={16} height={16} patternUnits="userSpaceOnUse">
          <Rect width={16} height={16} fill={color.checkA} />
          <Rect width={8} height={8} fill={color.checkB} />
          <Rect x={8} y={8} width={8} height={8} fill={color.checkB} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#share-checker)" />
    </Svg>
  );
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12 },
  content: { paddingBottom: 4 },
  stage: { marginTop: 14, paddingTop: 16, paddingBottom: 12, borderRadius: radii.lg, borderWidth: 1, alignItems: 'center' },
  preview: { overflow: 'hidden', borderRadius: 3 },
  caption: { fontFamily: type.weight.medium, fontSize: 11, marginTop: 12, textAlign: 'center', paddingHorizontal: 10 },
  lookHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 10, letterSpacing: 1.1 },
  exportNote: { fontFamily: type.weight.medium, fontSize: 10 },
  looks: { gap: 12, paddingBottom: 4 },
  look: { alignItems: 'center', gap: 6 },
  thumbnailFrame: { padding: 3, borderRadius: 8, borderWidth: 2 },
  thumbnail: { width: 64, height: 80, overflow: 'hidden', borderRadius: 3 },
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
  photoBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 13,
    marginTop: 12,
    minHeight: 48,
  },
  photoText: { fontFamily: type.weight.semibold, fontSize: 14 },
  notice: { textAlign: 'center', fontFamily: type.weight.semibold, fontSize: 13, marginTop: 12 },
});
