import { Camera, ImageIcon } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFeatureFlag } from '@/src/features/appConfig/store';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';
import { pickMealPhoto, type PhotoSource } from './pick';

/** "Snap your meal" on the Log food screen; hands the picked photo's uri on. */
export function PhotoEntry({ onPicked }: { onPicked: (uri: string) => void }) {
  const c = useThemeColors();
  const toast = useToast();
  const enabled = useFeatureFlag('photo_meal_log', true);
  const busy = useRef(false);
  if (!enabled) return null;

  const pick = async (source: PhotoSource) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const uri = await pickMealPhoto(source);
      if (uri === 'denied') toast('Camera access is off. Choose from your gallery, or allow the camera in Settings.', 'error');
      else if (uri) onPicked(uri);
    } catch {
      toast('Couldn’t open the photo. Please try again.', 'error');
    } finally {
      busy.current = false;
    }
  };

  const button = (source: PhotoSource, label: string, Icon: typeof Camera, primary: boolean) => (
    <Pressable onPress={() => pick(source)} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.button, primary ? { backgroundColor: c.primary } : { borderWidth: 1, borderColor: c.border, backgroundColor: c.card }, pressed && { opacity: 0.75 }]}>
      <Icon size={18} color={primary ? c.primaryText : c.text} strokeWidth={2.2} />
      <Text style={[styles.buttonText, { color: primary ? c.primaryText : c.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.card, { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
      <Text style={[styles.title, { color: c.text }]}>Snap your meal</Text>
      <Text style={[styles.body, { color: c.mutedText }]}>Take a photo and FitNyx lists the food with calories. You check it before it’s saved.</Text>
      <View style={styles.row}>
        {button('camera', 'Take photo', Camera, true)}
        {button('library', 'Gallery', ImageIcon, false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.base, gap: spacing.xs },
  title: { fontFamily: type.weight.bold, fontSize: 17 },
  body: { fontFamily: type.weight.regular, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  button: { flexGrow: 1, minHeight: 48, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.base },
  buttonText: { fontFamily: type.weight.semibold, fontSize: 15 },
});
