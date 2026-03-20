import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Activity, ChevronLeft, List, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchLatestMetric, fetchMetricsHistory, fetchWithAuth, saveMetric } from '@/src/lib/api';
import { addToOfflineQueue } from '@/src/lib/cache/indexeddb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NEON_LIME = '#5fc793';
const CHART_HEIGHT = 180;
const CHART_PADDING_TOP = 40;
const CHART_PADDING_BOTTOM = 40;
const CHART_INNER_PADDING = 34; // Equal padding on left and right inside the SVG

interface Metric {
  id: string;
  weight_kg: number | null;
  height_cm: number | null;
  source?: string;
  recorded_at: string;
}

const WEIGHT_UNITS = ['kg', 'lbs'] as const;
const HEIGHT_UNITS = ['cm', 'ft'] as const;

type WeightUnit = (typeof WEIGHT_UNITS)[number];
type HeightUnit = (typeof HEIGHT_UNITS)[number];
type ViewMode = 'CHART' | 'HISTORY';

function kgToLbs(value: number) { return value * 2.20462; }
function lbsToKg(value: number) { return value / 2.20462; }
function cmToFt(value: number) { return value / 30.48; }
function ftToCm(value: number) { return value * 30.48; }

function bmiFor(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm) return null;
  const hm = heightCm / 100;
  if (hm <= 0) return null;
  return Number((weightKg / (hm * hm)).toFixed(1));
}

function normalizeHistory(payload: any): Metric[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const WeightChart = ({ data, unit, palette, styles }: { data: Metric[], unit: WeightUnit, palette: any, styles: any }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const pointsRef = useRef<{ x: number; y: number; value: number; date: string }[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const currentPoints = pointsRef.current;
        if (!currentPoints || currentPoints.length === 0) return;

        let closestIndex = 0;
        let minDistance = Math.abs(touchX - currentPoints[0].x);

        currentPoints.forEach((p, i) => {
          const distance = Math.abs(touchX - p.x);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        });
        setActiveIndex(closestIndex);
      },
      onPanResponderRelease: () => setActiveIndex(null),
    })
  ).current;

  if (data.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Activity color={palette.border} size={48} />
        <Text style={styles.chartEmptyText}>Log at least 2 entries to see your progress chart</Text>
      </View>
    );
  }

  const sortedData = data
    .slice()
    .sort((a, b) => +new Date(a.recorded_at) - +new Date(b.recorded_at))
    .slice(-7);

  const chartData = sortedData.map(m => (unit === 'kg' ? m.weight_kg! : kgToLbs(m.weight_kg!)));

  const min = Math.min(...chartData);
  const max = Math.max(...chartData);
  const range = max - min || 1;
  const paddingBuffer = range * 0.2;
  const yMin = min - paddingBuffer;
  const yMax = max + paddingBuffer;
  const yRange = yMax - yMin;

  if (containerWidth === 0) {
    return (
      <View
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={[styles.chartWrapper, { height: CHART_HEIGHT + 60, justifyContent: 'center' }]}
      />
    );
  }

  const svgWidth = containerWidth - 24;
  const chartAreaWidth = svgWidth - (CHART_INNER_PADDING * 2);
  const chartAreaHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const points = chartData.map((val, i) => {
    const x = (i / (chartData.length - 1)) * chartAreaWidth + CHART_INNER_PADDING;
    const y = CHART_HEIGHT - CHART_PADDING_BOTTOM - ((val - yMin) / yRange) * chartAreaHeight;
    return { x, y, value: val, date: sortedData[i].recorded_at };
  });

  // Update ref so PanResponder can access latest points
  pointsRef.current = points;

  const yLabels = [yMin + yRange * 0.75, yMin + yRange * 0.5, yMin + yRange * 0.25];

  const pathData = points.reduce((acc, point, i) =>
    i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`, ''
  );

  const areaData = `${pathData} L ${points[points.length - 1].x} ${CHART_HEIGHT - CHART_PADDING_BOTTOM} L ${points[0].x} ${CHART_HEIGHT - CHART_PADDING_BOTTOM} Z`;

  return (
    <View style={styles.chartWrapper} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>{yMax.toFixed(0)}</Text>
          <Text style={styles.yLabel}>{((yMax + yMin) / 2).toFixed(0)}</Text>
          <Text style={styles.yLabel}>{yMin.toFixed(0)}</Text>
        </View>

        <Svg width={svgWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={NEON_LIME} stopOpacity="0.8" />
              <Stop offset="1" stopColor={NEON_LIME} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1={CHART_INNER_PADDING} y1={CHART_PADDING_TOP} x2={svgWidth - CHART_INNER_PADDING} y2={CHART_PADDING_TOP} stroke={palette.border} strokeWidth="1" />
          <Line x1={CHART_INNER_PADDING} y1={CHART_HEIGHT - CHART_PADDING_BOTTOM} x2={svgWidth - CHART_INNER_PADDING} y2={CHART_HEIGHT - CHART_PADDING_BOTTOM} stroke={palette.border} strokeWidth="1" />

          <Path d={areaData} fill="url(#gradient)" />
          <Path d={pathData} stroke={NEON_LIME} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r="4" fill={palette.background} stroke={NEON_LIME} strokeWidth="2" />
          ))}

          {activeIndex !== null && (
            <>
              <Line
                x1={points[activeIndex].x}
                y1={CHART_PADDING_TOP}
                x2={points[activeIndex].x}
                y2={CHART_HEIGHT - CHART_PADDING_BOTTOM}
                stroke={NEON_LIME}
                strokeWidth="1"
                strokeDasharray="4, 4"
              />
              <Circle cx={points[activeIndex].x} cy={points[activeIndex].y} r="6" fill={NEON_LIME} />
            </>
          )}
        </Svg>

        {activeIndex !== null && (
          <BlurView intensity={20} tint="light" style={[styles.tooltip, { left: Math.max(10, Math.min(svgWidth - 110, points[activeIndex].x - 50)) }]}>
            <Text style={styles.tooltipDate}>{formatDate(points[activeIndex].date)}</Text>
            <Text style={styles.tooltipValue}>{points[activeIndex].value.toFixed(1)} {unit}</Text>
          </BlurView>
        )}

        <View style={styles.chartLabels}>
          {sortedData.map((m, i) => (
            <Text key={i} style={[styles.chartXLabel, { left: points[i].x - 20 }]}>
              {new Date(m.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          ))}
        </View>
      </View>
      <Text style={styles.chartInstruction}>Touch and slide to explore details</Text>
    </View>
  );
};

export default function StatsScreen() {
  const palette = useThemeColors();
  const styles = getStyles(palette);
  const router = useRouter();
  const { isOnline } = useNetworkStatus();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [latest, setLatest] = useState<Metric | null>(null);
  const [history, setHistory] = useState<Metric[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('CHART');

  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyType, setBodyType] = useState('Mesomorph');

  const [error, setError] = useState<string | null>(null);

  // Sanitizers: only digits and one decimal point, capped length
  const sanitizeWeight = (text: string) => {
    const digits = text.replace(/[^0-9.]/g, '');
    const parts = digits.split('.');
    const whole = parts[0].slice(0, 3); // max 999
    if (parts.length > 1) {
      return whole + '.' + parts.slice(1).join('').slice(0, 1);
    }
    return whole;
  };

  const sanitizeHeight = (text: string) => {
    const digits = text.replace(/[^0-9.]/g, '');
    const parts = digits.split('.');
    const whole = parts[0].slice(0, 3); // max 999
    if (parts.length > 1) {
      return whole + '.' + parts.slice(1).join('').slice(0, 1);
    }
    return whole;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestMetric, metricsPayload] = await Promise.all([fetchLatestMetric(), fetchMetricsHistory()]);
      const normalizedHistory = normalizeHistory(metricsPayload);
      setLatest(latestMetric || null);
      setHistory(normalizedHistory);

      if (latestMetric?.weight_kg != null) {
        const value = weightUnit === 'kg' ? latestMetric.weight_kg : kgToLbs(latestMetric.weight_kg);
        setWeight(value.toFixed(1));
      }

      if (latestMetric?.height_cm != null) {
        const value = heightUnit === 'cm' ? latestMetric.height_cm : cmToFt(latestMetric.height_cm);
        setHeight(value.toFixed(heightUnit === 'cm' ? 1 : 2));
      }
    } catch (loadError) {
      console.error('Failed to load metrics', loadError);
      setError('Unable to load body stats right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!latest) return;
    if (latest.weight_kg != null) {
      const value = weightUnit === 'kg' ? latest.weight_kg : kgToLbs(latest.weight_kg);
      setWeight(value.toFixed(1));
    }
    if (latest.height_cm != null) {
      const value = heightUnit === 'cm' ? latest.height_cm : cmToFt(latest.height_cm);
      setHeight(value.toFixed(heightUnit === 'cm' ? 1 : 2));
    }
  }, [heightUnit, latest, weightUnit]);

  const bmi = useMemo(() => {
    const weightValue = Number(weight);
    const heightValue = Number(height);
    if (!Number.isFinite(weightValue) || !Number.isFinite(heightValue) || weightValue <= 0 || heightValue <= 0) return null;
    const metricWeight = weightUnit === 'kg' ? weightValue : lbsToKg(weightValue);
    const metricHeight = heightUnit === 'cm' ? heightValue : ftToCm(heightValue);
    return bmiFor(metricWeight, metricHeight);
  }, [height, heightUnit, weight, weightUnit]);

  const saveCurrentMetric = async () => {
    const weightValue = Number(weight);
    const heightValue = Number(height);
    if (!Number.isFinite(weightValue) || !Number.isFinite(heightValue) || weightValue <= 0 || heightValue <= 0) {
      Alert.alert('Invalid input', 'Please enter valid height and weight values.');
      return;
    }
    const weightKg = weightUnit === 'kg' ? weightValue : lbsToKg(weightValue);
    const heightCm = heightUnit === 'cm' ? heightValue : ftToCm(heightValue);

    // Range validation (kg: 20-350, cm: 50-300)
    if (weightKg < 20 || weightKg > 350) {
      Alert.alert('Invalid weight', 'Weight must be between 20–350 kg (44–772 lbs).');
      return;
    }
    if (heightCm < 50 || heightCm > 300) {
      Alert.alert('Invalid height', 'Height must be between 50–300 cm (1.6–9.8 ft).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { weight_kg: Number(weightKg.toFixed(2)), height_cm: Number(heightCm.toFixed(2)), source: 'user' };
      if (isOnline) {
        await saveMetric(payload);
        await loadData();
      } else {
        await addToOfflineQueue({ type: 'UPDATE_STATS', payload });
        // Optimistically update local state so the UI reflects the save
        const now = new Date().toISOString();
        const optimistic: Metric = {
          id: `offline-${Date.now()}`,
          weight_kg: payload.weight_kg,
          height_cm: payload.height_cm,
          source: 'user',
          recorded_at: now,
        };
        setLatest(optimistic);
        setHistory((prev) => [optimistic, ...prev]);
        Alert.alert('Saved offline', 'Your stats will sync once you are back online.');
      }
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save metrics.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMetric = (id: string) => {
    Alert.alert('Delete entry', 'This will permanently remove the selected metric entry.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetchWithAuth(`/metrics/${id}`, { method: 'DELETE' });
            await loadData();
          } catch (deleteError) {
            setError('Failed to delete metric entry.');
          }
        },
      },
    ]);
  };

  const displayWeightValue = (kg: number | null) => {
    if (kg == null) return '--';
    const value = weightUnit === 'kg' ? kg : kgToLbs(kg);
    return value.toFixed(1);
  };

  const displayHeightValue = (cm: number | null) => {
    if (cm == null) return '--';
    const value = heightUnit === 'cm' ? cm : cmToFt(cm);
    return value.toFixed(heightUnit === 'cm' ? 1 : 2);
  };

  return (
    <Screen scroll={false} style={{ backgroundColor: palette.background }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} style={styles.backButton}>
          <ChevronLeft color={palette.text} size={24} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>BODY STATS</Text>
          <Text style={styles.headerSubtitle}>Track your transformation</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={NEON_LIME} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BlurView intensity={10} tint="light" style={styles.snapshotContainer}>
            <Text style={styles.sectionLabel}>CURRENT SNAPSHOT</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>WEIGHT</Text>
                <Text style={styles.summaryValue}>{displayWeightValue(latest?.weight_kg ?? null)}<Text style={styles.summaryUnit}>{weightUnit}</Text></Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>HEIGHT</Text>
                <Text style={styles.summaryValue}>{displayHeightValue(latest?.height_cm ?? null)}<Text style={styles.summaryUnit}>{heightUnit}</Text></Text>
              </View>
              <View style={[styles.summaryCard, { borderRightWidth: 0 }]}>
                <Text style={styles.summaryLabel}>BMI</Text>
                <Text style={styles.summaryValue}>{latest ? bmiFor(latest.weight_kg, latest.height_cm) : '--'}</Text>
              </View>
            </View>

            <View style={styles.inputGrid}>
              <View style={styles.inputCol}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>WEIGHT UNIT</Text>
                </View>
                <View style={styles.unitSelector}>
                  {WEIGHT_UNITS.map(unit => {
                    const active = weightUnit === unit;
                    return (
                      <Pressable
                        key={unit}
                        onPress={() => setWeightUnit(unit)}
                        style={[styles.unitBtn, active && styles.unitBtnActive]}
                      >
                        <Text style={[styles.unitBtnText, active && styles.unitBtnTextActive]}>{unit.toUpperCase()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>WEIGHT</Text>
                <Input
                  value={weight}
                  keyboardType="decimal-pad"
                  onChangeText={setWeight}
                  sanitize={sanitizeWeight}
                  maxLength={5}
                  placeholder="0.0"
                  style={styles.premiumInput}
                />
              </View>

              <View style={styles.inputCol}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>HEIGHT UNIT</Text>
                </View>
                <View style={styles.unitSelector}>
                  {HEIGHT_UNITS.map(unit => {
                    const active = heightUnit === unit;
                    return (
                      <Pressable
                        key={unit}
                        onPress={() => setHeightUnit(unit)}
                        style={[styles.unitBtn, active && styles.unitBtnActive]}
                      >
                        <Text style={[styles.unitBtnText, active && styles.unitBtnTextActive]}>{unit.toUpperCase()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>HEIGHT</Text>
                <Input
                  value={height}
                  keyboardType="decimal-pad"
                  onChangeText={setHeight}
                  sanitize={sanitizeHeight}
                  maxLength={5}
                  placeholder="0.0"
                  style={styles.premiumInput}
                />
              </View>
            </View>

            <View style={styles.bodyTypeSection}>
              <Text style={styles.fieldLabel}>BODY TYPE</Text>
              <View style={styles.bodyTypeGrid}>
                {['Ectomorph', 'Mesomorph', 'Endomorph'].map((type) => {
                  const active = bodyType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setBodyType(type)}
                      style={[styles.bodyTypeBtn, active && styles.bodyTypeBtnActive]}
                    >
                      <Text style={[styles.bodyTypeBtnText, active && styles.bodyTypeBtnTextActive]}>{type.toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={saveCurrentMetric}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                saving && { opacity: 0.5 }
              ]}
            >
              {saving ? <ActivityIndicator color={palette.background} /> : <Text style={styles.saveButtonText}>SAVE STATS</Text>}
            </Pressable>
          </BlurView>

          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionLabel}>PROGRESS ANALYSIS</Text>
              <View style={styles.modeToggle}>
                <Pressable
                  onPress={() => setViewMode('CHART')}
                  style={[styles.toggleBtn, viewMode === 'CHART' && styles.toggleBtnActive]}
                >
                  <TrendingUp color={viewMode === 'CHART' ? palette.background : palette.mutedText} size={16} />
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('HISTORY')}
                  style={[styles.toggleBtn, viewMode === 'HISTORY' && styles.toggleBtnActive]}
                >
                  <List color={viewMode === 'HISTORY' ? palette.background : palette.mutedText} size={16} />
                </Pressable>
              </View>
            </View>

            {viewMode === 'CHART' ? (
              <WeightChart data={history} unit={weightUnit} palette={palette} styles={styles} />
            ) : (
              <View>
                {history.length === 0 ? (
                  <Text style={styles.emptyText}>No entries yet.</Text>
                ) : (
                  history
                    .slice()
                    .sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at))
                    .map((metric) => {
                      const rowBmi = bmiFor(metric.weight_kg, metric.height_cm);
                      return (
                        <View key={metric.id} style={styles.historyRow}>
                          <View style={styles.historyMain}>
                            <Text style={styles.historyDate}>{formatDate(metric.recorded_at)}</Text>
                            <Text style={styles.historyStats}>
                              {displayWeightValue(metric.weight_kg)} {weightUnit} • BMI {rowBmi ? rowBmi.toFixed(1) : '--'}
                            </Text>
                          </View>
                          <Pressable onPress={() => deleteMetric(metric.id)} style={styles.deleteButton}>
                            <Text style={styles.deleteText}>Delete</Text>
                          </Pressable>
                        </View>
                      );
                    })
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const getStyles = (palette: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: palette.mutedText,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotContainer: {
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: palette.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: palette.border,
  },
  summaryLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: palette.mutedText,
    letterSpacing: 1,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: palette.text,
  },
  summaryUnit: {
    fontSize: 9,
    color: NEON_LIME,
    marginLeft: 2,
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  inputCol: {
    flex: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: palette.mutedText,
    letterSpacing: 1,
    marginBottom: 6,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  unitBtn: {
    flex: 1,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnActive: {
    backgroundColor: NEON_LIME,
  },
  unitBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: palette.mutedText,
  },
  unitBtnTextActive: {
    color: '#000000',
  },
  premiumInput: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    height: 48,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    paddingHorizontal: 12,
  },
  bodyTypeSection: {
    marginBottom: 24,
  },
  bodyTypeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bodyTypeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  bodyTypeBtnActive: {
    borderColor: NEON_LIME,
    backgroundColor: 'rgba(128, 242, 13, 0.05)',
  },
  bodyTypeBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: palette.mutedText,
    letterSpacing: 0.5,
  },
  bodyTypeBtnTextActive: {
    color: NEON_LIME,
  },
  saveButton: {
    height: 56,
    backgroundColor: NEON_LIME,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: palette.background,
    letterSpacing: 1,
  },
  historySection: {
    marginTop: 32,
    paddingHorizontal: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: NEON_LIME,
  },
  chartWrapper: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: CHART_HEIGHT - CHART_PADDING_BOTTOM,
    justifyContent: 'space-between',
    paddingTop: CHART_PADDING_TOP,
    paddingBottom: 0,
    zIndex: 1,
  },
  yLabel: {
    fontSize: 8,
    color: palette.mutedText,
    fontWeight: '900',
    textAlign: 'center',
    width: CHART_INNER_PADDING,
  },
  chartLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CHART_PADDING_BOTTOM,
  },
  chartXLabel: {
    position: 'absolute',
    bottom: 5,
    fontSize: 7,
    color: palette.mutedText,
    fontWeight: '900',
    width: 40,
    textAlign: 'center',
  },
  chartInstruction: {
    fontSize: 8,
    color: palette.mutedText,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tooltip: {
    position: 'absolute',
    top: 10,
    padding: 8,
    borderRadius: 10,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    zIndex: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  tooltipDate: {
    fontSize: 8,
    color: palette.mutedText,
    fontWeight: '900',
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 12,
    color: NEON_LIME,
    fontWeight: '900',
  },
  chartEmpty: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
    borderRadius: 20,
    gap: 8,
  },
  chartEmptyText: {
    color: palette.mutedText,
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
    fontWeight: '600',
  },
  emptyText: {
    color: palette.mutedText,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  historyMain: {
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.text,
    marginBottom: 2,
  },
  historyStats: {
    fontSize: 10,
    color: palette.mutedText,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF4B4B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
