import { useRouter } from 'expo-router';
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Plus,
  Ruler,
  Scale,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Line as SvgLine,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Button } from '@/src/components/ui/Button';
import { Field } from '@/src/components/ui/Field';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { StatTile } from '@/src/components/ui/StatTile';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import {
  deleteMetric,
  fetchLatestMetric,
  fetchMetricsHistory,
  saveMetric,
} from '@/src/lib/api';
import { getFitnessProfile } from '@/src/lib/api/onboarding';
import { cacheGet, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';
import { useAuth } from '@/src/providers/AuthProvider';
import {
  cmToFt,
  ftInToCm,
  kgToLbs,
  lbsToKg,
  useHeightUnit,
  useWeightUnit,
} from '@/src/lib/prefs';
import { elevation, radii, spacing, type as t } from '@/src/styles/tokens';

type Metric = {
  id: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct?: number | null;
  measurements?: Record<string, number> | null;
  notes?: string;
  source?: string;
  recorded_at: string;
};

type Range = '7d' | '30d' | '90d' | '1y';
type BodyType = 'ectomorph' | 'mesomorph' | 'endomorph';

const BODY_TYPES: { value: BodyType; label: string; tagline: string }[] = [
  { value: 'ectomorph', label: 'Ectomorph', tagline: 'Lean' },
  { value: 'mesomorph', label: 'Mesomorph', tagline: 'Athletic' },
  { value: 'endomorph', label: 'Endomorph', tagline: 'Soft' },
];

const MEASUREMENT_PARTS = [
  { key: 'chest_cm', label: 'Chest' },
  { key: 'waist_cm', label: 'Waist' },
  { key: 'hips_cm', label: 'Hips' },
  { key: 'arms_cm', label: 'Arms' },
  { key: 'thigh_cm', label: 'Thigh' },
  { key: 'neck_cm', label: 'Neck' },
];

function bmiOf(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  if (m <= 0) return null;
  return Number((weightKg / (m * m)).toFixed(1));
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function withinRange(d: Date, range: Range): boolean {
  const dayMs = 86400000;
  const span =
    range === '7d' ? 7 * dayMs : range === '30d' ? 30 * dayMs : range === '90d' ? 90 * dayMs : 365 * dayMs;
  return Date.now() - d.getTime() <= span;
}

function formatDateShort(s: string) {
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function normalizeHistory(payload: any): Metric[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

// =====================================================================
// Chart with Y axis + X axis labels + target line
// =====================================================================

const CHART_HEIGHT = 220;
const CHART_PAD_TOP = 28;
const CHART_PAD_BOTTOM = 36;
const Y_AXIS_W = 34;
const CHART_PAD_RIGHT = 12;

function WeightChart({
  data,
  weightUnit,
  targetWeightKg,
  primary,
  border,
  cardBg,
  text,
  mutedText,
  warning,
}: {
  data: Metric[];
  weightUnit: 'kg' | 'lbs';
  targetWeightKg?: number;
  primary: string;
  border: string;
  cardBg: string;
  text: string;
  mutedText: string;
  warning: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const pointsRef = useRef<{ x: number; y: number; value: number; date: string }[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e) => {
        const tx = e.nativeEvent.locationX;
        const ps = pointsRef.current;
        if (ps.length === 0) return;
        let idx = 0;
        let min = Math.abs(tx - ps[0].x);
        ps.forEach((p, i) => {
          const dist = Math.abs(tx - p.x);
          if (dist < min) {
            min = dist;
            idx = i;
          }
        });
        setActiveIndex(idx);
      },
      onPanResponderRelease: () => setActiveIndex(null),
    })
  ).current;

  // sort + project series with target weight in domain
  const { points, yMin, yMax, yMid, targetY, xLabels } = useMemo(() => {
    if (width === 0 || data.length < 2) {
      return { points: [], yMin: 0, yMax: 0, yMid: 0, targetY: null as number | null, xLabels: [] as { x: number; label: string }[] };
    }
    const series = data
      .filter((m) => m.weight_kg != null)
      .map((m) => ({
        value: weightUnit === 'kg' ? (m.weight_kg as number) : kgToLbs(m.weight_kg as number),
        recorded_at: m.recorded_at,
      }))
      .sort((a, b) => +new Date(a.recorded_at) - +new Date(b.recorded_at));
    if (series.length < 2) {
      return { points: [], yMin: 0, yMax: 0, yMid: 0, targetY: null, xLabels: [] };
    }
    const values = series.map((s) => s.value);
    const target = targetWeightKg != null ? (weightUnit === 'kg' ? targetWeightKg : kgToLbs(targetWeightKg)) : null;
    const candidatePool = [...values];
    if (target != null) candidatePool.push(target);
    const min = Math.min(...candidatePool);
    const max = Math.max(...candidatePool);
    const range = max - min || 1;
    const buffer = range * 0.18;
    const yMinV = min - buffer;
    const yMaxV = max + buffer;
    const yRange = yMaxV - yMinV;
    const innerW = width - Y_AXIS_W - CHART_PAD_RIGHT;
    const innerH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;

    const pts = series.map((s, i) => {
      const x = (i / (series.length - 1)) * innerW + Y_AXIS_W;
      const y = CHART_HEIGHT - CHART_PAD_BOTTOM - ((s.value - yMinV) / yRange) * innerH;
      return { x, y, value: s.value, date: s.recorded_at };
    });

    const tY = target != null ? CHART_HEIGHT - CHART_PAD_BOTTOM - ((target - yMinV) / yRange) * innerH : null;

    // Spread x labels across 4-5 evenly-spaced indices
    const labelCount = Math.min(5, series.length);
    const step = Math.max(1, Math.floor((series.length - 1) / (labelCount - 1)));
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < series.length; i += step) {
      labels.push({ x: pts[i].x, label: formatDateShort(series[i].recorded_at) });
    }
    if (labels[labels.length - 1].x !== pts[pts.length - 1].x) {
      labels.push({ x: pts[pts.length - 1].x, label: formatDateShort(series[series.length - 1].recorded_at) });
    }

    return { points: pts, yMin: yMinV, yMax: yMaxV, yMid: (yMinV + yMaxV) / 2, targetY: tY, xLabels: labels };
  }, [data, weightUnit, width, targetWeightKg]);

  pointsRef.current = points;

  if (data.length < 2) {
    return (
      <View style={[styles.chartEmpty, { backgroundColor: cardBg, borderColor: border }]}>
        <Activity size={36} color={border} />
        <Text style={[styles.chartEmptyText, { color: mutedText }]}>
          Log at least 2 entries to see your trend
        </Text>
      </View>
    );
  }
  if (width === 0) {
    return (
      <View
        style={[styles.chartFrame, { backgroundColor: cardBg, borderColor: border, height: CHART_HEIGHT + 16 }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      />
    );
  }
  if (points.length === 0) return null;

  const path = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const area = `${path} L ${points[points.length - 1].x} ${CHART_HEIGHT - CHART_PAD_BOTTOM} L ${points[0].x} ${CHART_HEIGHT - CHART_PAD_BOTTOM} Z`;

  return (
    <View
      style={[styles.chartFrame, { backgroundColor: cardBg, borderColor: border }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View {...panResponder.panHandlers}>
        <Svg width={width} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="weight-grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={primary} stopOpacity="0.45" />
              <Stop offset="1" stopColor={primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* horizontal grid lines */}
          <SvgLine
            x1={Y_AXIS_W}
            y1={CHART_PAD_TOP}
            x2={width - CHART_PAD_RIGHT}
            y2={CHART_PAD_TOP}
            stroke={border}
            strokeDasharray="3 6"
          />
          <SvgLine
            x1={Y_AXIS_W}
            y1={(CHART_PAD_TOP + (CHART_HEIGHT - CHART_PAD_BOTTOM)) / 2}
            x2={width - CHART_PAD_RIGHT}
            y2={(CHART_PAD_TOP + (CHART_HEIGHT - CHART_PAD_BOTTOM)) / 2}
            stroke={border}
            strokeDasharray="3 6"
            opacity={0.5}
          />
          <SvgLine
            x1={Y_AXIS_W}
            y1={CHART_HEIGHT - CHART_PAD_BOTTOM}
            x2={width - CHART_PAD_RIGHT}
            y2={CHART_HEIGHT - CHART_PAD_BOTTOM}
            stroke={border}
          />

          {/* Y axis labels */}
          <SvgText x={Y_AXIS_W - 6} y={CHART_PAD_TOP + 4} fill={mutedText} fontSize={10} textAnchor="end">
            {yMax.toFixed(0)}
          </SvgText>
          <SvgText x={Y_AXIS_W - 6} y={(CHART_PAD_TOP + (CHART_HEIGHT - CHART_PAD_BOTTOM)) / 2 + 4} fill={mutedText} fontSize={10} textAnchor="end">
            {yMid.toFixed(0)}
          </SvgText>
          <SvgText x={Y_AXIS_W - 6} y={CHART_HEIGHT - CHART_PAD_BOTTOM + 4} fill={mutedText} fontSize={10} textAnchor="end">
            {yMin.toFixed(0)}
          </SvgText>

          {/* Target weight line */}
          {targetY != null ? (
            <>
              <SvgLine
                x1={Y_AXIS_W}
                y1={targetY}
                x2={width - CHART_PAD_RIGHT}
                y2={targetY}
                stroke={warning}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <SvgText x={width - CHART_PAD_RIGHT - 2} y={targetY - 4} fill={warning} fontSize={10} textAnchor="end" fontWeight="700">
                TARGET
              </SvgText>
            </>
          ) : null}

          {/* Area + line */}
          <Path d={area} fill="url(#weight-grad)" />
          <Path d={path} stroke={primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4} fill={cardBg} stroke={primary} strokeWidth={2} />
          ))}

          {/* X axis labels */}
          {xLabels.map((l, i) => (
            <SvgText
              key={i}
              x={l.x}
              y={CHART_HEIGHT - 12}
              fill={mutedText}
              fontSize={10}
              textAnchor="middle"
            >
              {l.label}
            </SvgText>
          ))}

          {activeIndex !== null ? (
            <>
              <SvgLine
                x1={points[activeIndex].x}
                y1={CHART_PAD_TOP}
                x2={points[activeIndex].x}
                y2={CHART_HEIGHT - CHART_PAD_BOTTOM}
                stroke={primary}
                strokeDasharray="3 4"
              />
              <Circle cx={points[activeIndex].x} cy={points[activeIndex].y} r={7} fill={primary} />
            </>
          ) : null}
        </Svg>

        {activeIndex !== null ? (
          <View
            style={[
              styles.tooltip,
              {
                backgroundColor: cardBg,
                borderColor: primary,
                left: Math.max(8, Math.min(width - 130, points[activeIndex].x - 60)),
              },
            ]}
          >
            <Text style={[styles.tooltipDate, { color: mutedText }]}>
              {formatDateShort(points[activeIndex].date)}
            </Text>
            <Text style={[styles.tooltipValue, { color: text }]}>
              {points[activeIndex].value.toFixed(1)} {weightUnit}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// =====================================================================
// Screen
// =====================================================================

export default function StatsScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id;

  const [weightUnit, setWeightUnit] = useWeightUnit();
  const [heightUnit, setHeightUnit] = useHeightUnit();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [latest, setLatest] = useState<Metric | null>(null);
  const [history, setHistory] = useState<Metric[]>([]);
  const [targetWeightKg, setTargetWeightKg] = useState<number | undefined>(undefined);

  const [range, setRange] = useState<Range>('30d');
  const [tab, setTab] = useState<'chart' | 'history'>('chart');
  const [logOpen, setLogOpen] = useState(false);

  // form
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCmInput] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [bodyType, setBodyType] = useState<BodyType>('mesomorph');
  const [measurementsExpanded, setMeasurementsExpanded] = useState(false);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const filtered = useMemo(
    () => history.filter((m) => withinRange(new Date(m.recorded_at), range)),
    [history, range]
  );

  const delta = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at)
    );
    if (sorted.length < 2) return null;
    const cur = sorted[0]?.weight_kg;
    const prev = sorted[1]?.weight_kg;
    if (cur == null || prev == null) return null;
    return cur - prev;
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const [cachedLatest, cachedHist, cachedFitness] = await Promise.all([
          cacheGet<Metric | null>(cacheKeys.bodyMetricsLatest(userId)),
          cacheGet<Metric[]>(cacheKeys.bodyMetricsHistory(userId)),
          cacheGet<{ target_weight_kg?: number }>(cacheKeys.fitnessProfile(userId)),
        ]);
        if (cancelled) return;
        if (cachedLatest) setLatest(cachedLatest);
        if (cachedHist?.length) setHistory(normalizeHistory(cachedHist));
        if (cachedFitness?.target_weight_kg && cachedFitness.target_weight_kg > 0) {
          setTargetWeightKg(cachedFitness.target_weight_kg);
        }
        // Always flip loading off after hydrate so we never get stuck on a spinner;
        // loadData refreshes in the background.
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    hydrate().finally(() => {
      if (userId) loadData();
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!logOpen) return;
    if (latest?.weight_kg != null) {
      const w = weightUnit === 'kg' ? latest.weight_kg : kgToLbs(latest.weight_kg);
      setWeight(w.toFixed(1));
    }
    if (latest?.height_cm != null) {
      if (heightUnit === 'cm') {
        setHeightCmInput(latest.height_cm.toFixed(0));
      } else {
        const { ft, in: inches } = cmToFt(latest.height_cm);
        setHeightFt(String(ft));
        setHeightIn(String(inches));
      }
    }
  }, [logOpen, latest, weightUnit, heightUnit]);

  const loadData = async () => {
    try {
      const [latestMetric, hist, fitness] = await Promise.all([
        fetchLatestMetric(),
        fetchMetricsHistory(),
        getFitnessProfile().catch(() => null),
      ]);
      setLatest(latestMetric || null);
      setHistory(normalizeHistory(hist));
      const tw = fitness?.target_weight_kg;
      setTargetWeightKg(typeof tw === 'number' && tw > 0 ? tw : undefined);
      if (userId) {
        cacheSet(cacheKeys.bodyMetricsLatest(userId), latestMetric ?? null, cacheTTL.LONG).catch(() => undefined);
        cacheSet(cacheKeys.bodyMetricsHistory(userId), hist, cacheTTL.LONG).catch(() => undefined);
        if (fitness) {
          cacheSet(cacheKeys.fitnessProfile(userId), fitness, cacheTTL.LONG).catch(() => undefined);
        }
      }
    } catch (err) {
      console.error('Failed to load metrics', err);
      // Don't alert if we already have cached data on screen
      if (loading) {
        Alert.alert('Error', 'Unable to load body stats.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const weightKg = weightUnit === 'kg' ? parseFloat(weight) : lbsToKg(parseFloat(weight));
      let heightInCm: number | undefined;
      if (heightUnit === 'cm') {
        const v = parseFloat(heightCm);
        heightInCm = isNaN(v) ? undefined : v;
      } else {
        const ft = parseFloat(heightFt);
        const inches = parseFloat(heightIn || '0');
        if (!isNaN(ft)) heightInCm = ftInToCm(ft, isNaN(inches) ? 0 : inches);
      }

      if (isNaN(weightKg) && heightInCm == null) {
        Alert.alert('Missing data', 'Enter weight or height.');
        setSaving(false);
        return;
      }

      const measurementsClean: Record<string, number> = {};
      for (const [k, v] of Object.entries(measurements)) {
        const n = parseFloat(v);
        if (!isNaN(n) && n > 0) measurementsClean[k] = n;
      }

      await saveMetric({
        weight_kg: isNaN(weightKg) ? undefined : weightKg,
        height_cm: heightInCm,
        measurements: Object.keys(measurementsClean).length ? measurementsClean : undefined,
        notes: notes.trim() || undefined,
        source: 'user',
      });

      setMeasurements({});
      setNotes('');
      setMeasurementsExpanded(false);
      setLogOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save metric', err);
      Alert.alert('Error', 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete entry', 'Remove this measurement permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMetric(id);
            await loadData();
          } catch {
            Alert.alert('Error', 'Could not delete.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.flexCenter, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const currentBmi = bmiOf(latest?.weight_kg, latest?.height_cm);

  const weightDisplay = latest?.weight_kg != null
    ? weightUnit === 'kg'
      ? latest.weight_kg.toFixed(1)
      : kgToLbs(latest.weight_kg).toFixed(1)
    : '—';

  const heightDisplay = latest?.height_cm != null
    ? heightUnit === 'cm'
      ? `${Math.round(latest.height_cm)}`
      : (() => {
          const { ft, in: inches } = cmToFt(latest.height_cm);
          return `${ft}′${inches}″`;
        })()
    : '—';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <PressableScale
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
            style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <ChevronLeft size={22} color={c.text} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: c.mutedText }]}>BODY STATS</Text>
            <Text style={[styles.h1, { color: c.text }]}>Your progress</Text>
          </View>
        </View>

        {/* Hero */}
        <View
          style={[
            styles.hero,
            { backgroundColor: c.card, borderColor: c.border },
            elevation.md,
          ]}
        >
          <Text style={[styles.eyebrow, { color: c.mutedText }]}>CURRENT WEIGHT</Text>
          <View style={styles.heroValueRow}>
            <Text style={[styles.heroValue, { color: c.text }]}>{weightDisplay}</Text>
            <Text style={[styles.heroUnit, { color: c.primary }]}>{weightUnit}</Text>
          </View>
          {delta != null ? (
            <View style={styles.deltaRow}>
              {delta < 0 ? (
                <TrendingDown size={14} color={c.success} strokeWidth={2.4} />
              ) : delta > 0 ? (
                <TrendingUp size={14} color={c.warning} strokeWidth={2.4} />
              ) : (
                <Activity size={14} color={c.mutedText} strokeWidth={2.4} />
              )}
              <Text
                style={[
                  styles.deltaText,
                  { color: delta < 0 ? c.success : delta > 0 ? c.warning : c.mutedText },
                ]}
              >
                {Math.abs(weightUnit === 'kg' ? delta : kgToLbs(delta)).toFixed(1)} {weightUnit} vs last entry
              </Text>
            </View>
          ) : (
            <Text style={[styles.deltaText, { color: c.mutedText }]}>
              Log more entries to see trend
            </Text>
          )}
          {targetWeightKg != null ? (
            <View style={styles.deltaRow}>
              <Target size={12} color={c.warning} strokeWidth={2.4} />
              <Text style={[styles.deltaText, { color: c.warning }]}>
                Target: {(weightUnit === 'kg' ? targetWeightKg : kgToLbs(targetWeightKg)).toFixed(1)} {weightUnit}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Quick stats */}
        <View style={styles.tilesRow}>
          <StatTile label="Height" value={heightDisplay} unit={heightUnit === 'cm' ? 'cm' : ''} />
          <StatTile
            label="BMI"
            value={currentBmi ? currentBmi.toFixed(1) : '—'}
            delta={currentBmi ? { direction: 'neutral', text: bmiCategory(currentBmi) } : undefined}
            accent
          />
        </View>

        {/* Tabs */}
        <SectionHeader
          eyebrow="Progress"
          trailing={
            <View style={{ width: 200 }}>
              <SegmentedControl
                options={[
                  { label: 'Chart', value: 'chart' },
                  { label: 'History', value: 'history' },
                ]}
                value={tab}
                onChange={setTab}
              />
            </View>
          }
        />

        {tab === 'chart' ? (
          <>
            <View style={styles.rangeWrap}>
              <SegmentedControl
                options={[
                  { label: '7D', value: '7d' },
                  { label: '30D', value: '30d' },
                  { label: '90D', value: '90d' },
                  { label: '1Y', value: '1y' },
                ]}
                value={range}
                onChange={setRange}
              />
            </View>
            <View style={{ paddingHorizontal: spacing.base }}>
              <WeightChart
                data={filtered}
                weightUnit={weightUnit}
                targetWeightKg={targetWeightKg}
                primary={c.primary}
                border={c.border}
                cardBg={c.card}
                text={c.text}
                mutedText={c.mutedText}
                warning={c.warning}
              />
            </View>
          </>
        ) : (
          // History — capped height container, scroll inside
          <View
            style={[
              styles.historyContainer,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            {history.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Activity size={28} color={c.border} />
                <Text style={[styles.chartEmptyText, { color: c.mutedText }]}>No entries yet</Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 320 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.xs }}
              >
                {[...history]
                  .sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at))
                  .map((m, idx) => (
                    <View
                      key={m.id}
                      style={[
                        styles.historyRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: c.border,
                          paddingTop: spacing.sm,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.historyDate, { color: c.text }]}>
                          {new Date(m.recorded_at).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                        <Text style={[styles.historyMeta, { color: c.mutedText }]}>
                          {m.weight_kg != null
                            ? `${weightUnit === 'kg' ? m.weight_kg.toFixed(1) : kgToLbs(m.weight_kg).toFixed(1)} ${weightUnit}`
                            : '—'}
                          {m.notes ? ` · ${m.notes.slice(0, 28)}${m.notes.length > 28 ? '…' : ''}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDelete(m.id)}
                        hitSlop={10}
                        style={{ padding: spacing.xs }}
                      >
                        <Trash2 size={18} color={c.destructive} strokeWidth={1.8} />
                      </Pressable>
                    </View>
                  ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Log entry CTA */}
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.lg }}>
          <Button title="+ Log new entry" onPress={() => setLogOpen(true)} />
        </View>

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* Log bottom sheet */}
      <Modal
        visible={logOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLogOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setLogOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Log new entry</Text>
            <Pressable onPress={() => setLogOpen(false)}>
              <Text style={[styles.sheetCancel, { color: c.mutedText }]}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: '85%' }}
            contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Weight */}
            <View style={{ gap: spacing.xs }}>
              <View style={styles.fieldHeader}>
                <Text style={[styles.eyebrow, { color: c.mutedText }]}>WEIGHT</Text>
                <View style={{ width: 130 }}>
                  <SegmentedControl
                    options={[
                      { label: 'KG', value: 'kg' },
                      { label: 'LBS', value: 'lbs' },
                    ]}
                    value={weightUnit}
                    onChange={setWeightUnit}
                  />
                </View>
              </View>
              <Field
                value={weight}
                onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, '').slice(0, 6))}
                keyboardType="decimal-pad"
                placeholder={weightUnit === 'kg' ? '74.0' : '163.0'}
                leading={<Scale size={18} color={c.mutedText} strokeWidth={1.8} />}
              />
            </View>

            {/* Height */}
            <View style={{ gap: spacing.xs }}>
              <View style={styles.fieldHeader}>
                <Text style={[styles.eyebrow, { color: c.mutedText }]}>HEIGHT</Text>
                <View style={{ width: 130 }}>
                  <SegmentedControl
                    options={[
                      { label: 'CM', value: 'cm' },
                      { label: 'FT', value: 'ft' },
                    ]}
                    value={heightUnit}
                    onChange={setHeightUnit}
                  />
                </View>
              </View>
              {heightUnit === 'cm' ? (
                <Field
                  value={heightCm}
                  onChangeText={(v) => setHeightCmInput(v.replace(/[^0-9.]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                  placeholder="180"
                  leading={<Ruler size={18} color={c.mutedText} strokeWidth={1.8} />}
                />
              ) : (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field
                      value={heightFt}
                      onChangeText={(v) => setHeightFt(v.replace(/[^0-9]/g, '').slice(0, 2))}
                      keyboardType="number-pad"
                      placeholder="5"
                      helper="feet"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      value={heightIn}
                      onChangeText={(v) => setHeightIn(v.replace(/[^0-9]/g, '').slice(0, 2))}
                      keyboardType="number-pad"
                      placeholder="11"
                      helper="inches"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Body type */}
            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.eyebrow, { color: c.mutedText }]}>BODY TYPE</Text>
              <View style={styles.bodyTypeRow}>
                {BODY_TYPES.map((bt) => {
                  const active = bodyType === bt.value;
                  return (
                    <PressableScale
                      key={bt.value}
                      onPress={() => setBodyType(bt.value)}
                      style={[
                        styles.bodyTypeCard,
                        {
                          backgroundColor: active ? `${c.primary}1A` : c.surface,
                          borderColor: active ? c.primary : c.border,
                        },
                      ]}
                    >
                      <Text style={[styles.bodyTypeLabel, { color: active ? c.primary : c.text }]}>
                        {bt.label}
                      </Text>
                      <Text style={[styles.bodyTypeTag, { color: c.mutedText }]}>{bt.tagline}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Measurements expandable */}
            <Pressable
              onPress={() => setMeasurementsExpanded((v) => !v)}
              style={[styles.expandHeader, { borderColor: c.border }]}
            >
              <View>
                <Text style={[styles.eyebrow, { color: c.mutedText }]}>MEASUREMENTS</Text>
                <Text style={[styles.expandHint, { color: c.text }]}>Tape measure (optional)</Text>
              </View>
              {measurementsExpanded ? (
                <ChevronUp size={18} color={c.mutedText} />
              ) : (
                <ChevronDown size={18} color={c.mutedText} />
              )}
            </Pressable>

            {measurementsExpanded ? (
              <View style={{ gap: spacing.sm }}>
                {MEASUREMENT_PARTS.map((p) => (
                  <View key={p.key} style={styles.measureRow}>
                    <Text style={[styles.measureLabel, { color: c.text }]}>{p.label}</Text>
                    <View style={{ width: 110 }}>
                      <Field
                        value={measurements[p.key] || ''}
                        onChangeText={(v) =>
                          setMeasurements((prev) => ({
                            ...prev,
                            [p.key]: v.replace(/[^0-9.]/g, '').slice(0, 5),
                          }))
                        }
                        keyboardType="decimal-pad"
                        placeholder="cm"
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Notes */}
            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.eyebrow, { color: c.mutedText }]}>NOTES (OPTIONAL)</Text>
              <View style={[styles.notesBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                <TextInput
                  value={notes}
                  onChangeText={(v) => v.length <= 200 && setNotes(v)}
                  placeholder="How did this measurement go?"
                  placeholderTextColor={c.mutedText}
                  multiline
                  textAlignVertical="top"
                  style={[styles.notesInput, { color: c.text }]}
                  maxLength={200}
                />
              </View>
            </View>

            <Button
              title={saving ? 'Saving…' : 'Save Entry'}
              onPress={handleSave}
              loading={saving}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  flexCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: t.weight.extrabold,
    fontSize: t.size.h1,
    letterSpacing: t.tracking.tight,
    marginTop: 2,
  },
  hero: {
    marginHorizontal: spacing.base,
    padding: spacing.lg,
    borderRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  heroValue: {
    fontFamily: t.weight.extrabold,
    fontSize: 56,
    letterSpacing: -1.5,
  },
  heroUnit: {
    fontFamily: t.weight.bold,
    fontSize: t.size.body,
    letterSpacing: t.tracking.wide,
    textTransform: 'uppercase',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  deltaText: {
    fontFamily: t.weight.medium,
    fontSize: t.size.xs,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  rangeWrap: {
    paddingHorizontal: spacing.base,
  },
  chartFrame: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  chartEmpty: {
    marginHorizontal: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 160,
  },
  chartEmptyText: {
    fontFamily: t.weight.medium,
    fontSize: t.size.sm,
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    top: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 100,
    alignItems: 'center',
  },
  tooltipDate: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  tooltipValue: {
    fontFamily: t.weight.bold,
    fontSize: t.size.body,
  },
  historyContainer: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyEmpty: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  historyDate: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.body,
  },
  historyMeta: {
    fontFamily: t.weight.medium,
    fontSize: t.size.xs,
  },
  // sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: t.weight.bold,
    fontSize: t.size.h3,
  },
  sheetCancel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.body,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bodyTypeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bodyTypeCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 2,
    minHeight: 60,
    justifyContent: 'center',
  },
  bodyTypeLabel: {
    fontFamily: t.weight.bold,
    fontSize: t.size.sm,
  },
  bodyTypeTag: {
    fontFamily: t.weight.regular,
    fontSize: t.size.micro,
    textAlign: 'center',
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  expandHint: {
    fontFamily: t.weight.medium,
    fontSize: t.size.sm,
  },
  measureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  measureLabel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.body,
    flex: 1,
  },
  notesBox: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    minHeight: 80,
  },
  notesInput: {
    fontFamily: t.weight.regular,
    fontSize: t.size.body,
    minHeight: 60,
  },
});
