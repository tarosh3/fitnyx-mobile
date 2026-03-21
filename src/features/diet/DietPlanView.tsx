import { BlurView } from 'expo-blur';
import {
  ChevronDown,
  Circle,
  Droplets,
  Dumbbell,
  Edit2,
  Flame,
  Layers,
  Leaf,
  RefreshCw,
  Sparkles,
  Wheat,
  Zap
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { DietFoodItem, DietPlan } from '@/src/lib/api';

const NEON_LIME = '#5fc793';

interface DietPlanViewProps {
  plan: DietPlan;
  onRegenerate: () => void;
  onEditPreferences: () => void;
  isLoading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────

function parseMacroGrams(value: string): number {
  const match = value.match(/([\d.]+)/);
  return match ? Number(match[1]) : 0;
}

function getMealEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("breakfast") || n.includes("morning")) return "🍳";
  if (n.includes("lunch") || n.includes("afternoon")) return "🥗";
  if (n.includes("dinner") || n.includes("evening")) return "🍲";
  if (n.includes("snack")) return "🥜";
  if (n.includes("pre-workout") || n.includes("pre workout")) return "⚡";
  if (n.includes("post-workout") || n.includes("post workout")) return "💪";
  return "🍽️";
}

type NormalizedItem = {
  dish: string;
  descriptor?: string;
  composition?: Record<string, string>;
  ingredients?: string[];
};

const COMPOSITION_LABELS: Record<string, string> = {
  base: "BASE",
  protein: "PROTEIN",
  veggies: "VEGGIES",
  flavor: "FLAVOR",
  fat: "FAT",
  extras: "EXTRAS",
};

const COMPOSITION_ICONS: Record<string, any> = {
  base: Circle,
  protein: Dumbbell,
  veggies: Leaf,
  flavor: Sparkles,
  fat: Droplets,
  extras: Layers,
};

function normalizeFoodItem(item: DietFoodItem | string): NormalizedItem {
  if (typeof item === "object" && item !== null && "dish" in item) {
    return {
      dish: item.dish,
      descriptor: item.descriptor,
      composition: item.composition as Record<string, string> | undefined,
      ingredients: item.ingredients,
    };
  }
  const str = String(item);
  return { dish: str };
}

function getAlternatives(meal: any): (DietFoodItem | string)[] {
  return meal.alternatives || meal.alternative_items || meal.alternative_options || [];
}

// ─── Components ───────────────────────────────────────────

function MacroBar({ label, value, grams, maxGrams, color, icon: Icon }: any) {
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  const pct = maxGrams > 0 ? Math.min((grams / maxGrams) * 100, 100) : 0;
  return (
    <View style={styles.macroCard}>
      <View style={styles.macroHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon size={12} color={color} />
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
        <Text style={styles.macroValue}>{value}</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function FoodItemCard({ item, isSmall = false }: { item: NormalizedItem; isSmall?: boolean }) {
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  return (
    <View style={isSmall ? styles.foodItemSmall : styles.foodItem}>
      <View style={styles.foodItemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={isSmall ? styles.foodDishSmall : styles.foodDish}>{item.dish}</Text>
          {item.descriptor ? (
            <View style={styles.descriptorBadge}>
              <Text style={styles.descriptorText}>{item.descriptor.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {item.composition && (
        <View style={styles.compositionGrid}>
          {Object.entries(item.composition).map(([key, val]) => {
            if (!val) return null;
            const Icon = COMPOSITION_ICONS[key] || Layers;
            return (
              <View key={key} style={styles.compCard}>
                <View style={styles.compIconWrap}>
                  <Icon size={12} color={palette.mutedText} />
                  <Text style={styles.compKeyText}>{COMPOSITION_LABELS[key] || key.toUpperCase()}</Text>
                </View>
                <Text style={styles.compValText}>{val}</Text>
              </View>
            );
          })}
        </View>
      )}

      {!item.composition && item.ingredients && item.ingredients.length > 0 && (
        <View style={styles.ingredientsBox}>
          <Text style={styles.ingredients}>{item.ingredients.join(' • ')}</Text>
        </View>
      )}
    </View>
  );
}

export function DietPlanView({ plan, onRegenerate, onEditPreferences, isLoading }: DietPlanViewProps) {
  const palette = useThemeColors();
  const styles = React.useMemo(() => getStyles(palette), [palette]);
  const { plan_data } = plan;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const proteinG = parseMacroGrams(plan_data.macros.protein);
  const carbsG = parseMacroGrams(plan_data.macros.carbs);
  const fatsG = parseMacroGrams(plan_data.macros.fats);
  const maxMacro = Math.max(proteinG, carbsG, fatsG, 1);


  return (
    <View style={styles.container}>
      {/* Hero: Daily Goal */}
      <BlurView intensity={20} tint="dark" style={styles.heroCard}>
        <Text style={styles.heroOverline}>DAILY NUTRITION GOAL</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
          <Text style={styles.heroCalories}>{plan_data.total_calories.toLocaleString()}</Text>
          <Text style={styles.heroUnit}>kcal</Text>
        </View>
        <Text style={styles.heroSummary}>{plan_data.summary}</Text>

        <View style={styles.macroGrid}>
          <MacroBar label="Protein" value={plan_data.macros.protein} grams={proteinG} maxGrams={maxMacro} color="#38bdf8" icon={Zap} />
          <MacroBar label="Carbs" value={plan_data.macros.carbs} grams={carbsG} maxGrams={maxMacro} color="#10b981" icon={Wheat} />
          <MacroBar label="Fats" value={plan_data.macros.fats} grams={fatsG} maxGrams={maxMacro} color="#f59e0b" icon={Droplets} />
        </View>
      </BlurView>

      {/* Meal Schedule */}
      <View style={{ gap: 16 }}>
        <Text style={styles.sectionTitle}>MEAL SCHEDULE</Text>
        {plan_data.meals.map((meal, idx) => {
          const isExpanded = expandedIndex === idx;
          const alternatives = getAlternatives(meal);

          return (
            <View key={idx} style={[styles.mealCard, isExpanded && styles.mealCardExpanded]}>
              <Pressable
                onPress={() => setExpandedIndex(isExpanded ? null : idx)}
                style={styles.mealHeader}
              >
                <View style={styles.mealLeft}>
                  <View style={styles.emojiContainer}>
                    <Text style={styles.mealEmoji}>{getMealEmoji(meal.name)}</Text>
                  </View>
                  <View>
                    <Text style={styles.mealName}>{meal.name.toUpperCase()}</Text>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                  </View>
                </View>
                <View style={styles.mealRight}>
                  <View style={styles.calBadge}>
                    <Flame size={12} color={NEON_LIME} />
                    <Text style={styles.calBadgeText}>{meal.calories}</Text>
                  </View>
                  <ChevronDown size={20} color={palette.mutedText} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                </View>
              </Pressable>

              {isExpanded && (
                <View style={styles.mealContent}>
                  <View style={styles.contentDivider} />

                  {/* Main Items */}
                  <View style={styles.itemsSection}>
                    {meal.items.map((item, i) => (
                      <FoodItemCard key={i} item={normalizeFoodItem(item)} />
                    ))}
                  </View>

                  {/* Meal Macros */}
                  <View style={styles.mealMacros}>
                    <View style={styles.macroStatCard}>
                      <Text style={styles.macroStatVal}>{meal.macros.p}</Text>
                      <Text style={styles.macroStatKey}>PROTEIN</Text>
                    </View>
                    <View style={styles.macroStatCard}>
                      <Text style={styles.macroStatVal}>{meal.macros.c}</Text>
                      <Text style={styles.macroStatKey}>CARBS</Text>
                    </View>
                    <View style={styles.macroStatCard}>
                      <Text style={styles.macroStatVal}>{meal.macros.f}</Text>
                      <Text style={styles.macroStatKey}>FATS</Text>
                    </View>
                  </View>

                  {/* Alternatives */}
                  {alternatives.length > 0 && (
                    <View style={styles.altSection}>
                      <View style={styles.altHeader}>
                        <View style={styles.altHighlight} />
                        <Layers size={14} color={NEON_LIME} />
                        <Text style={styles.altHeaderTitle}>ALTERNATIVES</Text>
                      </View>
                      <View style={styles.altGrid}>
                        {alternatives.map((alt, i) => (
                          <FoodItemCard key={i} item={normalizeFoodItem(alt)} isSmall />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={onRegenerate}
          disabled={isLoading}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9, scale: 0.98 }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#0A0A0A" />
          ) : (
            <>
              <RefreshCw size={18} color="#0A0A0A" strokeWidth={3} />
              <Text style={styles.primaryBtnText}>REGENERATE PLAN</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onEditPreferences}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
        >
          <Edit2 size={16} color={palette.text} />
          <Text style={styles.secondaryBtnText}>EDIT PREFERENCES</Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  container: {
    gap: 24,
  },
  heroCard: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 24,
    backgroundColor: palette.card,
    overflow: 'hidden',
  },
  heroOverline: {
    color: palette.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroCalories: {
    color: palette.text,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroUnit: {
    color: palette.mutedText,
    fontSize: 18,
    fontWeight: '600',
  },
  heroSummary: {
    color: palette.mutedText,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  macroGrid: {
    gap: 12,
  },
  macroCard: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  macroValue: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
  },
  macroTrack: {
    height: 4,
    backgroundColor: palette.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionTitle: {
    color: palette.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    paddingLeft: 4,
  },
  mealCard: {
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  mealCardExpanded: {
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealName: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mealTime: {
    color: palette.mutedText,
    fontSize: 12,
    fontWeight: '500',
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(128, 242, 13, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  calBadgeText: {
    color: NEON_LIME,
    fontSize: 12,
    fontWeight: '900',
  },
  mealContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contentDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginBottom: 20,
    marginTop: 8,
  },
  itemsSection: {
    gap: 20,
  },
  foodItem: {
    gap: 16,
  },
  foodItemHeader: {
    gap: 4,
  },
  foodDish: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  foodItemSmall: {
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
  },
  foodDishSmall: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  descriptorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(128, 242, 13, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  descriptorText: {
    color: NEON_LIME,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  compositionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compCard: {
    width: '48%', // Adjusted slightly
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: palette.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 6,
  },
  compIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compKeyText: {
    color: palette.mutedText,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  compValText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  ingredientsBox: {
    backgroundColor: palette.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  ingredients: {
    color: palette.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  mealMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 32,
  },
  macroStatCard: {
    flex: 1,
    backgroundColor: palette.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    gap: 2,
  },
  macroStatVal: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '900',
  },
  macroStatKey: {
    color: palette.mutedText,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  altSection: {
    marginTop: 40,
    gap: 20,
  },
  altHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  altHighlight: {
    width: 4,
    height: 14,
    backgroundColor: NEON_LIME,
    borderRadius: 2,
  },
  altHeaderTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  altGrid: {
    gap: 8,
  },
  actions: {
    gap: 12,
    marginTop: 12,
    marginBottom: 40,
  },
  primaryBtn: {
    backgroundColor: NEON_LIME,
    height: 56,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryBtnText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
