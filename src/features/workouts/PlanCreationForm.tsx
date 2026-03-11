import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { PlanData } from '@/src/features/workouts/types';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { sanitizeGeneralText, MAX_TITLE, MAX_LONG_TEXT, MAX_SHORT_TEXT } from '@/src/lib/validators';
import { Calendar, ChevronRight, Info, Target } from 'lucide-react-native';
import { Pressable } from 'react-native';

const NEON_LIME = '#5fc793';
const DEPTH_BG = '#000000';
const CARD_BG = 'rgba(255, 255, 255, 0.03)';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

interface PlanCreationFormProps {
  initialData: PlanData;
  onSubmit: (data: PlanData) => void;
  loading: boolean;
}

const GOALS = [
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'others', label: 'Others' },
];

export function PlanCreationForm({ initialData, onSubmit, loading }: PlanCreationFormProps) {
  const palette = useThemeColors();
  const isPredefinedGoal = (value?: string) => GOALS.some((goal) => goal.value === value && goal.value !== 'others');

  const [formData, setFormData] = useState<PlanData>(initialData);
  const [selectedGoal, setSelectedGoal] = useState(
    formData.goal ? (isPredefinedGoal(formData.goal) ? formData.goal : 'others') : ''
  );
  const [showCustomGoal, setShowCustomGoal] = useState(formData.goal ? !isPredefinedGoal(formData.goal) : false);

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>CREATE YOUR PLAN</Text>
          <Text style={styles.formSubtitle}>GIVE YOUR WORKOUT PLAN A NAME AND DEFINE YOUR GOAL</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Info size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.fieldLabel}>PLAN NAME *</Text>
          </View>
          <Input
            value={formData.title}
            onChangeText={(title) => setFormData({ ...formData, title })}
            placeholder="e.g. SUMMER SHRED"
            sanitize={(v) => sanitizeGeneralText(v, MAX_TITLE)}
            maxLength={MAX_TITLE}
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Info size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          </View>
          <Input
            value={formData.description || ''}
            onChangeText={(description) => setFormData({ ...formData, description })}
            placeholder="BRIEF DESCRIPTION"
            multiline
            numberOfLines={4}
            sanitize={(v) => sanitizeGeneralText(v, MAX_LONG_TEXT)}
            maxLength={MAX_LONG_TEXT}
            style={styles.textArea}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Target size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.fieldLabel}>PRIMARY GOAL</Text>
          </View>
          <View style={styles.chipsWrap}>
            {GOALS.map((goal) => {
              const active = selectedGoal === goal.value;
              return (
                <Pressable
                  key={goal.value}
                  onPress={() => {
                    setSelectedGoal(goal.value);
                    if (goal.value === 'others') {
                      setShowCustomGoal(true);
                      setFormData({ ...formData, goal: '' });
                    } else {
                      setShowCustomGoal(false);
                      setFormData({ ...formData, goal: goal.value });
                    }
                  }}
                  style={[
                    styles.goalChip,
                    active && styles.goalChipActive
                  ]}
                >
                  <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>
                    {goal.label.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {showCustomGoal ? (
            <Input
              value={formData.goal || ''}
              onChangeText={(goal) => setFormData({ ...formData, goal })}
              placeholder="ENTER CUSTOM GOAL"
              sanitize={(v) => sanitizeGeneralText(v, MAX_SHORT_TEXT)}
              maxLength={MAX_SHORT_TEXT}
              style={[styles.input, { marginTop: 12 }]}
            />
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Calendar size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.fieldLabel}>WORKOUT DAYS PER WEEK *</Text>
          </View>
          <View style={styles.dayRow}>
            {[3, 4, 5, 6, 7].map((numDays) => {
              const active = formData.numDays === numDays;
              return (
                <Pressable
                  key={numDays}
                  onPress={() => setFormData({ ...formData, numDays })}
                  style={[
                    styles.dayChoice,
                    active && styles.dayChoiceActive
                  ]}
                >
                  <Text style={[styles.dayChoiceText, active && styles.dayChoiceTextActive]}>
                    {numDays}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Pressable
        disabled={loading || !formData.title.trim()}
        onPress={() => onSubmit(formData)}
        style={({ pressed }) => [
          styles.submitBtn,
          (loading || !formData.title.trim()) && { opacity: 0.5 },
          pressed && { opacity: 0.9, scale: 0.98 }
        ]}
      >
        <Text style={styles.submitBtnText}>
          {loading ? 'CREATING PLAN...' : 'CONTINUE TO DAYS'}
        </Text>
        <ChevronRight size={18} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  formCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    gap: 24,
  },
  formHeader: {
    gap: 4,
  },
  formTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  formSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputGroup: {
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: BORDER_COLOR,
    color: '#fff',
    height: 52,
    borderRadius: 14,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: BORDER_COLOR,
    color: '#fff',
    minHeight: 100,
    borderRadius: 14,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalChipActive: {
    backgroundColor: 'rgba(128, 242, 13, 0.1)',
    borderColor: 'rgba(128, 242, 13, 0.3)',
  },
  goalChipText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
  },
  goalChipTextActive: {
    color: NEON_LIME,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayChoice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: 'rgba(255,255,255,0.03)',
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChoiceActive: {
    backgroundColor: NEON_LIME,
    borderColor: NEON_LIME,
  },
  dayChoiceText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '900',
  },
  dayChoiceTextActive: {
    color: '#000',
  },
  submitBtn: {
    backgroundColor: NEON_LIME,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
