import * as ImagePicker from 'expo-image-picker';
import { Download, ImagePlus, Share2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useAuth } from '@/src/providers/AuthProvider';
import { ArtCustomizer } from '@/src/features/share/ArtCustomizer';
import { artworkChoices, artworkSubject, profileAppearance, type ArtworkSelection, type ArtworkSubject } from '@/src/features/share/artwork';
import type { ShareCardData } from '@/src/features/share/cardData';
import { LookPicker, type LookOption } from '@/src/features/share/LookPicker';
import { useCardCatalog } from '@/src/features/share/remote/useCardCatalog';
import { CARD_SIZE, ShareCard, TEMPLATES, type CardFormat, type BuiltinTemplate, type ShareTemplate } from '@/src/features/share/ShareCard';
import { captureCard, saveCardImage, shareCardImage } from '@/src/features/share/shareImage';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { Sheet } from '@/src/features/workouts/ui/Sheet';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, type } from '@/src/styles/tokens';

const FORMATS: { label: string; value: CardFormat }[] = [
  { label: 'Story  ·  9:16', value: 'story' },
  { label: 'Post  ·  4:5', value: 'post' },
];
const LOOK_NOTES: Record<BuiltinTemplate, string> = {
  glow: 'A little effort. A lot of character.',
  motion: 'Your effort, straight from the notebook.',
  paper: 'One for the scrapbook.',
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
  const { userProfile, user } = useAuth();
  const window = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [appearance, setAppearance] = useState<ArtworkSelection>('auto');
  const [subject, setSubject] = useState<ArtworkSubject | 'auto'>('auto');
  const [template, setTemplate] = useState<ShareTemplate>('glow');
  const [format, setFormat] = useState<CardFormat>('story');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loadedArt, setLoadedArt] = useState<string | null>(null);
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const catalog = useCardCatalog(visible, busy !== null);
  const { width, height } = CARD_SIZE[format];
  const previewHeight = Math.min(410, window.height * 0.42, ((window.width - 64) * height) / width);
  const scale = previewHeight / height;
  const choices = data ? artworkChoices(data) : [];
  const inferredSubject = data ? artworkSubject(data) : 'full-body';
  const selectedSubject = subject !== 'auto' && choices.includes(subject) ? subject : inferredSubject;
  const gender = userProfile?.gender ?? user?.user_metadata?.gender;
  const selectedAppearance = appearance === 'auto' ? profileAppearance(typeof gender === 'string' ? gender : undefined) : appearance;
  const renderedData = data ? { ...data, artworkAppearance: selectedAppearance, artworkSubject: selectedSubject } : null;
  const design = catalog?.templates.find(t => `remote:${t.id}` === template && data && t.kinds.includes(data.kind));
  const activeTemplate = template.startsWith('remote:') && !design ? 'glow' : template;
  const artKey = `${visible}:${data?.kind}:${activeTemplate}:${catalog?.revision}:${format}:${selectedAppearance}:${selectedSubject}:${appearance}:${subject}`;
  const artReady = loadedArt === artKey;
  const needsArt = !!design || activeTemplate === 'glow' || activeTemplate === 'paper' || (activeTemplate === 'photo' && !photoUri);
  const customizeArt = design ? design.layouts[format].blocks.some(b => b.type === 'artwork' || !!b.variants?.length) : needsArt;
  const photoKey = `${artKey}:${photoUri}`;
  const photoReady = loadedPhoto === photoKey;
  const needsPhoto = activeTemplate === 'photo' && (!photoUri || !photoReady);
  const templates: LookOption[] = data ? [
    ...TEMPLATES[data.kind],
    ...(catalog?.templates.filter(t => t.kinds.includes(data.kind)).map(t => ({ value: `remote:${t.id}` as ShareTemplate, label: t.label, design: t })) ?? []),
  ] : [];

  useEffect(() => {
    if (!visible) {
      setLoadedArt(null);
      setLoadedPhoto(null);
      setAppearance('auto');
      setSubject('auto');
    }
  }, [visible]);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }).catch(() => null);
    if (res && !res.canceled && res.assets[0]) {
      if (res.assets[0].uri !== photoUri) setLoadedPhoto(null);
      setPhotoUri(res.assets[0].uri);
      setNotice(null);
    }
  };

  const run = async (action: 'share' | 'save') => {
    if (!data || (needsArt && !artReady) || needsPhoto || busy) return;
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
      title="Worth a little brag."
      subtitle="Your effort, with a little character."
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button
            variant="secondary"
            title="Save image"
            icon={<Download size={19} color={c.text} />}
            onPress={() => void run('save')}
            loading={busy === 'save'}
            disabled={!data || (needsArt && !artReady) || needsPhoto || busy !== null}
          />
          <Button
            title="Share"
            icon={<Share2 size={19} color={c.primaryText} />}
            onPress={() => void run('share')}
            loading={busy === 'share'}
            disabled={!data || (needsArt && !artReady) || needsPhoto || busy !== null}
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
              if (next === format) return;
              setLoadedArt(null);
              setLoadedPhoto(null);
              setFormat(next);
              setNotice(null);
            }}
          />
        </View>
        <View style={[styles.stage, { backgroundColor: c.background, borderColor: c.border }]}>
          {data ? (
            <View style={[styles.preview, { width: width * scale, height: previewHeight }]}>
              {activeTemplate === 'sticker' ? <Checker color={c.share.sticker} width={width * scale} height={previewHeight} /> : null}
              {/* The surrounding stage/checker are outside the capture ref. */}
              <View style={{ width, height, transform: [{ scale }], transformOrigin: 'top left' }}>
                <ShareCard
                  key={artKey}
                  ref={cardRef}
                  onArtworkLoad={() => setLoadedArt(artKey)}
                  onArtworkError={() => {
                    setLoadedArt(null);
                    if (design) setTemplate('glow');
                    setNotice({ text: design ? 'This design is unavailable. Using the offline Doodle card.' : 'Artwork couldn’t load. Reopen this sheet to try again.', error: true });
                  }}
                  data={renderedData!}
                  format={format}
                  template={activeTemplate}
                  design={design}
                  photoUri={photoUri}
                  onPhotoLoad={() => setLoadedPhoto(photoKey)}
                  onPhotoError={() => {
                    setLoadedPhoto(null);
                    setNotice({ text: 'This photo couldn’t load. Please choose another.', error: true });
                  }}
                />
              </View>
            </View>
          ) : null}
          <Text style={[styles.caption, { color: c.mutedText }]}>{design?.description ?? LOOK_NOTES[activeTemplate as BuiltinTemplate]}</Text>
        </View>
        <View style={styles.lookHeader}>
          <Text style={[styles.eyebrow, { color: c.mutedText }]}>CHOOSE YOUR LOOK</Text>
          <Text style={[styles.exportNote, { color: c.mutedText }]}>1080 px PNG</Text>
        </View>
        <LookPicker
          looks={templates}
          active={activeTemplate}
          data={renderedData}
          format={format}
          photoUri={photoUri}
          disabled={busy !== null}
          onSelect={(value) => {
            if (value === template) return;
            setLoadedArt(null);
            setLoadedPhoto(null);
            setTemplate(value);
            setNotice(null);
          }}
        />
        {customizeArt && data ? (
          <ArtCustomizer
            appearance={appearance}
            subject={subject}
            inferredSubject={inferredSubject}
            choices={choices}
            disabled={busy !== null}
            onAppearance={(value) => {
              setAppearance(value);
              setLoadedArt(null);
              setNotice(null);
            }}
            onSubject={(value) => {
              setSubject(value);
              setLoadedArt(null);
              setNotice(null);
            }}
          />
        ) : null}
        {activeTemplate === 'photo' ? (
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
  eyebrow: { fontFamily: type.weight.bold, fontSize: type.size.micro, letterSpacing: 1.1 },
  exportNote: { fontFamily: type.weight.medium, fontSize: type.size.micro },
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
