import { ChevronLeft, ChevronRight, FileText, Table } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { AiReportCard } from '@/src/features/workouts/report/AiReportCard';
import { reportFileName, shareCsv, sharePdf } from '@/src/features/workouts/report/exportFile';
import { fmtDuration, reportCsv, reportHtml } from '@/src/features/workouts/report/formats';
import { type RangeKind, reportRange, reportTotals } from '@/src/features/workouts/report/model';
import { BottomBar, Button, TopBar, useBottomBarSpace } from '@/src/features/workouts/ui/Chrome';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { fetchReportData, type ReportData } from '@/src/lib/api/reports';
import { useAuth } from '@/src/providers/AuthProvider';
import { radii, spacing, type } from '@/src/styles/tokens';

const KINDS: { label: string; value: RangeKind }[] = [{ label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }, { label: 'Year', value: 'year' }];

/** Export a week / month / year as a PDF or CSV, and the weekly AI report. */
export function ReportScreen() {
  const c = useThemeColors();
  const toast = useToast();
  const space = useBottomBarSpace();
  const { user } = useAuth();
  const [kind, setKind] = useState<RangeKind>('month');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ReportData | null>(null);
  const [failed, setFailed] = useState(false);
  const [profile, setProfile] = useState(true);
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const range = useMemo(() => reportRange(kind, offset), [kind, offset]);
  const totals = useMemo(() => (data ? reportTotals(data) : null), [data]);
  const empty = !!totals && totals.workouts === 0 && totals.roams === 0;

  useEffect(() => {
    let live = true;
    setData(null);
    setFailed(false);
    fetchReportData(range.from, range.to)
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [range.from, range.to]);

  const exportAs = async (format: 'pdf' | 'csv') => {
    if (!data || !totals) return;
    setBusy(format);
    try {
      const name = reportFileName(`report-${range.from}-to-${range.to}`, format);
      if (format === 'pdf') await sharePdf(reportHtml(data, totals, range, { includeProfile: profile }), name);
      else await shareCsv(reportCsv(data), name);
    } catch {
      toast(`Couldn’t create the ${format.toUpperCase()}. Try again.`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const tiles: [string, string][] = totals ? [
    ['Workouts', String(totals.workouts)], ['Training days', String(totals.trainingDays)], ['Time', fmtDuration(totals.durationSec)],
    ['Volume', `${Math.round(totals.volumeKg).toLocaleString('en-US')} kg`], ['Records', String(totals.prs)], ['Roams', `${totals.roamKm.toFixed(1)} km`],
  ] : [];

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <TopBar title="Reports" subtitle="For you, your coach, a doctor or an AI" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space }]}>
        <SegmentedControl options={KINDS} value={kind} onChange={(k) => { setKind(k); setOffset(0); }} />
        <View style={styles.stepper}>
          <Pressable onPress={() => setOffset((o) => o + 1)} accessibilityRole="button" accessibilityLabel={`Previous ${kind}`} hitSlop={8} style={styles.step}>
            <ChevronLeft size={24} color={c.text} />
          </Pressable>
          <Text style={[styles.range, { color: c.text }]} accessibilityRole="header">{range.label}</Text>
          <Pressable disabled={offset === 0} onPress={() => setOffset((o) => o - 1)} accessibilityRole="button" accessibilityLabel={`Next ${kind}`}
            accessibilityState={{ disabled: offset === 0 }} hitSlop={8} style={[styles.step, offset === 0 && { opacity: 0.3 }]}>
            <ChevronRight size={24} color={c.text} />
          </Pressable>
        </View>

        {failed ? <Text style={[styles.body, { color: c.mutedText }]}>Couldn’t load this period. Reports need a connection.</Text>
          : !totals ? <ActivityIndicator style={styles.pad} color={c.primary} />
            : (
              <>
                <View style={styles.tiles}>
                  {tiles.map(([k, v]) => (
                    <View key={k} style={[styles.tile, { backgroundColor: c.card, borderColor: c.border }]}>
                      <Text style={[styles.tileLabel, { color: c.mutedText }]}>{k}</Text>
                      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                    </View>
                  ))}
                </View>
                {empty ? <Text style={[styles.body, { color: c.mutedText }]}>Nothing logged in this period.</Text> : null}
                {totals.exercises.slice(0, 5).map((e) => (
                  <Text key={e.uuid} style={[styles.body, { color: c.text }]} numberOfLines={1}>
                    {e.title} <Text style={{ color: c.mutedText }}>· {e.sets} sets{e.bestWeightKg ? ` · best ${e.bestWeightKg} kg × ${e.bestReps}` : ''}</Text>
                  </Text>
                ))}
                <View style={[styles.toggle, { borderColor: c.border }]}>
                  <View style={styles.grow}>
                    <Text style={[styles.toggleTitle, { color: c.text }]}>Include my profile in the PDF</Text>
                    <Text style={[styles.hint, { color: c.mutedText }]}>Age, sex, height, weight, goal and injuries — helps a doctor or coach.</Text>
                  </View>
                  <Switch value={profile} onValueChange={setProfile} accessibilityLabel="Include my profile in the PDF" />
                </View>
              </>
            )}

        <AiReportCard userId={user?.id} firstName={data?.profile.first_name} />
      </ScrollView>

      <BottomBar>
        <View style={styles.pair}>
          <Button testID="export-csv" variant="secondary" title="CSV" icon={<Table size={20} color={c.text} />} loading={busy === 'csv'}
            disabled={!totals || empty || busy !== null} onPress={() => exportAs('csv')} />
          <Button testID="export-pdf" title="Share PDF" icon={<FileText size={20} color={c.primaryText} />} loading={busy === 'pdf'}
            disabled={!totals || empty || busy !== null} onPress={() => exportAs('pdf')} />
        </View>
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  range: { flex: 1, textAlign: 'center', fontFamily: type.weight.bold, fontSize: 17 },
  pad: { padding: spacing.lg },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '31%', flexGrow: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, padding: spacing.md, gap: 2 },
  tileLabel: { fontFamily: type.weight.regular, fontSize: 13 },
  tileValue: { fontFamily: type.weight.extrabold, fontSize: 18 },
  body: { fontFamily: type.weight.regular, fontSize: 15 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  grow: { flex: 1 },
  toggleTitle: { fontFamily: type.weight.semibold, fontSize: 16 },
  hint: { fontFamily: type.weight.regular, fontSize: 13 },
  pair: { flex: 1, flexDirection: 'row', gap: spacing.sm },
});
