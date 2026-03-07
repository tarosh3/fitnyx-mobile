import { useVideoPlayer, VideoView } from 'expo-video';
import { Lightbulb, X } from 'lucide-react-native';
import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Exercise, RelatedExercise } from '@/src/types/exercise';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: RelatedExercise) => void;
}

const NEON_LIME = '#80f20d';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

export function ExerciseDetailModal({ exercise, isOpen, onClose, onSelectExercise }: ExerciseDetailModalProps) {
  const videoUrl = exercise?.video_url || (exercise?.media_url?.toLowerCase().endsWith('.mp4') ? exercise?.media_url : null);
  const imageUrl = exercise?.media_url && !exercise?.media_url.toLowerCase().endsWith('.mp4') ? exercise?.media_url : (exercise?.video_url ? null : exercise?.media_url);

  const player = useVideoPlayer(videoUrl || '', (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  if (!exercise) return null;

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>{exercise.title.toUpperCase()}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X color="#fff" size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.videoWrap}>
              {videoUrl ? (
                <VideoView
                  player={player}
                  style={styles.videoBg}
                  contentFit="cover"
                  nativeControls={false}
                />
              ) : imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.videoBg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoBg} />
              )}
            </View>

            {/* Pro Tip */}
            {exercise.pro_tip ? (
              <View style={styles.proTipCard}>
                <View style={styles.proTipHeader}>
                  <Lightbulb color={NEON_LIME} size={16} />
                  <Text style={styles.proTipTitle}>PRO TIP</Text>
                </View>
                <Text style={styles.proTipText}>{exercise.pro_tip}</Text>
              </View>
            ) : null}

            {/* Targeted Muscles */}
            {exercise.primary_muscles?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TARGETED MUSCLES</Text>
                <View style={styles.muscleTags}>
                  {exercise.primary_muscles.map((muscle) => (
                    <View key={muscle.name} style={styles.muscleTagPrimary}>
                      <Text style={styles.muscleTagLabelPrimary}>Primary:</Text>
                      <Text style={styles.muscleTagValuePrimary}>{muscle.name}</Text>
                      <View style={styles.dot} />
                    </View>
                  ))}
                  {exercise.secondary_muscles?.map((muscle) => (
                    <View key={muscle.name} style={styles.muscleTagSecondary}>
                      <Text style={styles.muscleTagLabelSecondary}>Secondary:</Text>
                      <Text style={styles.muscleTagValueSecondary}>{muscle.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INSTRUCTIONS</Text>
              <Text style={styles.instructionText}>
                {exercise.how_to || 'No detailed instructions available for this exercise. Focus on maintaining proper form and controlled movements.'}
              </Text>
            </View>

            {/* Variations */}
            {exercise.variations?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>VARIATIONS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizPills}>
                  {exercise.variations
                    .filter((variation) => variation.uuid !== exercise.uuid)
                    .map((variation) => (
                      <Pressable
                        key={variation.uuid}
                        onPress={() => onSelectExercise(variation)}
                        style={styles.pill}
                      >
                        <Text style={styles.pillText}>{variation.name}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Alternatives */}
            {exercise.alternatives?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ALTERNATIVES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizPills}>
                  {exercise.alternatives
                    .filter((alt) => alt.uuid !== exercise.uuid)
                    .map((alt) => (
                      <Pressable
                        key={alt.uuid}
                        onPress={() => onSelectExercise(alt)}
                        style={styles.pill}
                      >
                        <Text style={styles.pillText}>{alt.name}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Extra padding for bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: DEPTH_BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: BORDER_COLOR,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    flex: 1,
    paddingRight: 16,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 32,
  },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  videoBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NEON_LIME,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEON_LIME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  proTipCard: {
    backgroundColor: 'rgba(128, 242, 13, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(128, 242, 13, 0.08)',
    borderRadius: 24,
    padding: 20,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proTipTitle: {
    color: NEON_LIME,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  proTipText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.4,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  muscleTagPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  muscleTagSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    opacity: 0.8,
  },
  muscleTagLabelPrimary: {
    color: '#94A3B8',
    fontSize: 14,
  },
  muscleTagValuePrimary: {
    color: NEON_LIME,
    fontSize: 14,
    fontWeight: '900',
  },
  muscleTagLabelSecondary: {
    color: '#94A3B8',
    fontSize: 14,
  },
  muscleTagValueSecondary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    opacity: 0.9,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: NEON_LIME,
    shadowColor: NEON_LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  instructionText: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 24,
  },
  horizPills: {
    gap: 12,
    paddingRight: 16,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
