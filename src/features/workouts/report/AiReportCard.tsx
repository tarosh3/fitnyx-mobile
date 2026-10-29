import { BrandLoader } from '@/src/components/ui/BrandLoader';
import { Lock, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { reportFileName, sharePdf } from '@/src/features/workouts/report/exportFile';
import { aiReportHtml } from '@/src/features/workouts/report/formats';
import { MarkdownText } from '@/src/features/workouts/report/MarkdownText';
import { useAiReport } from '@/src/features/workouts/report/useAiReport';
import { Button } from '@/src/features/workouts/ui/Chrome';
import { useToast } from '@/src/features/workouts/ui/Toast';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { radii, spacing, type } from '@/src/styles/tokens';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** The weekly AI report: locked until 10 training days, then one new report per week. */
export function AiReportCard({ userId, firstName }: { userId?: string; firstName?: string }) {
  const c = useThemeColors();
  const toast = useToast();
  const { status, loading, error, generate } = useAiReport(userId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const report = status?.report?.content ? status.report : null;

  const pdf = async () => {
    if (!report?.content) return;
    setBusy(true);
    try {
      await sharePdf(aiReportHtml(report.content, { name: firstName, from: report.period_from.slice(0, 10), to: report.period_to.slice(0, 10), createdAt: report.created_at }),
        reportFileName(`ai-report-${report.created_at.slice(0, 10)}`, 'pdf'));
    } catch {
      toast('Couldn’t create the PDF. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };
  // Plain text for a chat app or another AI (ChatGPT, Gemini…).
  const shareText = () => {
    if (report?.content) Share.share({ message: report.content, title: 'My FitNyx AI training report' }).catch(() => undefined);
  };

  let body: React.ReactNode;
  if (loading && !status) {
    body = <BrandLoader color={c.primary} />;
  } else if (status && !status.unlocked) {
    const pct = Math.min(1, status.training_days / status.required_days);
    const left = status.required_days - status.training_days;
    body = (
      <>
        <View style={styles.row}><Lock size={18} color={c.mutedText} /><Text style={[styles.title, { color: c.text }]}>Unlocks after {status.required_days} training days</Text></View>
        <View style={[styles.track, { backgroundColor: c.surface }]}><View style={[styles.fill, { backgroundColor: c.primary, width: `${pct * 100}%` }]} /></View>
        <Text style={[styles.body, { color: c.mutedText }]}>{status.training_days} of {status.required_days} days done. Train on {left} more {left === 1 ? 'day' : 'days'} — a workout or a Roam counts.</Text>
      </>
    );
  } else if (status?.generating) {
    body = (
      <View style={styles.row}><BrandLoader color={c.primary} /><Text style={[styles.body, styles.grow, { color: c.text }]}>Your coach is writing your report. This takes about a minute.</Text></View>
    );
  } else if (report?.content) {
    body = (
      <>
        <Text style={[styles.body, { color: c.mutedText }]}>Written {day(report.created_at)} · last 4 weeks</Text>
        {open ? <MarkdownText markdown={report.content} /> : null}
        <View style={styles.actions}>
          <Button title={open ? 'Hide report' : 'Read report'} onPress={() => setOpen((v) => !v)} style={styles.noFlex} />
          <View style={styles.pair}>
            <Button variant="secondary" title="Share PDF" loading={busy} onPress={pdf} />
            <Button variant="secondary" title="Share text" onPress={shareText} />
          </View>
          {status?.next_available_at ? (
            <Text style={[styles.hint, { color: c.mutedText }]}>Your next report is ready to write on {day(status.next_available_at)}.</Text>
          ) : (
            <Button variant="quiet" title="Write this week’s report" onPress={generate} style={styles.noFlex} />
          )}
        </View>
      </>
    );
  } else {
    body = (
      <>
        <Text style={[styles.body, { color: c.mutedText }]}>Your coach reviews your last 4 weeks and all-time progress, then tells you what to do next. One new report a week.</Text>
        <Button testID="ai-report-generate" title="Write my report" onPress={generate} style={styles.noFlex} />
      </>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}><Sparkles size={20} color={c.accent} /><Text style={[styles.heading, { color: c.text }]}>AI training report</Text></View>
      {body}
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: c.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.xl, padding: spacing.base, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { fontFamily: type.weight.extrabold, fontSize: 18 },
  title: { fontFamily: type.weight.bold, fontSize: 16 },
  body: { fontFamily: type.weight.regular, fontSize: 15, lineHeight: 21 },
  hint: { fontFamily: type.weight.regular, fontSize: 14 },
  grow: { flex: 1 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  actions: { gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.sm },
  noFlex: { flexGrow: 0 },
});
