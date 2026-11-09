import { clockTime, longDate, weekLabel, weekStart } from '@/src/features/workouts/report/dates';
import { markdownToHtml, reportCsv } from '@/src/features/workouts/report/formats';
import { aiReportHtml, reportHtml } from '@/src/features/workouts/report/pdf';
import { byMonth, byWeek, roamTitle, timeline } from '@/src/features/workouts/report/timeline';
import { est1RM, reportRange, reportTotals } from '@/src/features/workouts/report/model';
import type { ReportData } from '@/src/lib/api/reports';

const set = (uuid: string, reps: number, weight: number | null, extra: Partial<ReportData['sessions'][number]['sets'][number]> = {}) => ({
  exercise_uuid: uuid, set_index: 1, reps, weight_kg: weight, duration_sec: null, distance_m: null, rest_sec: null, rpe: null, is_warmup: false, is_pr: false, ...extra,
});

const data: ReportData = {
  from: '2026-10-01', to: '2026-10-31',
  profile: { first_name: 'Asha', age: 30, weight_kg: 62.5, goal: 'build muscle', injuries: ['knee'] },
  exercises: {
    bench: { title: 'Bench, "Flat" <b>', tracking_type: 'weight_reps', primary_muscles: ['Chest'] },
    plank: { title: 'Plank', tracking_type: 'duration', primary_muscles: ['Abs'] },
    pullup: { title: 'Assisted Pull-up', tracking_type: 'assisted_reps', primary_muscles: ['Lats'] },
  },
  sessions: [
    { id: 's1', name: 'Push', date: '2026-10-02', started_at: '2026-10-02T07:42:00', duration_sec: 3000, sets: [
      set('bench', 10, 40, { is_warmup: true }), set('bench', 8, 50, { set_index: 2 }), set('plank', 0, null, { duration_sec: 75 }),
    ] },
    { id: 's2', name: 'Push', date: '2026-10-09', started_at: '2026-10-09T18:15:00', duration_sec: 3600, sets: [
      set('bench', 6, 60, { is_pr: true }), set('pullup', 8, null, { assist_kg: 25 }), set('pullup', 7, null, { set_index: 2, assist_kg: 20, is_pr: true }),
    ] },
  ],
  roams: [
    { date: '2026-10-09', started_at: '2026-10-09T06:50:00', type: 'run', name: null, distance_m: 5000, moving_time_sec: 1500, elapsed_time_sec: 1600, avg_pace_sec_per_km: 300, elevation_gain_m: 12, steps: 5000 },
    { date: '2026-10-11', type: 'cycle', name: 'Commute', distance_m: 10000, moving_time_sec: 1800, elapsed_time_sec: 1900, avg_pace_sec_per_km: 180, elevation_gain_m: null, steps: null },
  ],
};

describe('reportRange', () => {
  const now = new Date(2026, 9, 1); // Thu 1 Oct 2026
  it('weeks run Monday to Sunday, across months', () => {
    expect(reportRange('week', 0, now)).toMatchObject({ from: '2026-09-28', to: '2026-10-04', label: '28 Sep – 4 Oct 2026' });
    expect(reportRange('week', 1, now)).toMatchObject({ from: '2026-09-21', to: '2026-09-27' });
  });
  it('months and years', () => {
    expect(reportRange('month', 0, now)).toMatchObject({ from: '2026-10-01', to: '2026-10-31', label: 'October 2026' });
    expect(reportRange('month', 10, now)).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    expect(reportRange('year', 1, now)).toMatchObject({ from: '2025-01-01', to: '2025-12-31', label: '2025' });
  });
});

describe('reportTotals', () => {
  const t = reportTotals(data);
  it('counts training days across workouts and Roams, skips warm-ups in volume', () => {
    expect(t).toMatchObject({ workouts: 2, trainingDays: 3, sets: 6, workingSets: 5, volumeKg: 760, prs: 2, roams: 2, roamKm: 15 });
  });
  it('tracks progress per exercise within the range', () => {
    const bench = t.exercises[0];
    expect(bench).toMatchObject({ title: 'Bench, "Flat" <b>', sets: 3, bestWeightKg: 60, bestReps: 6, prs: 1,
      days: 2, firstDate: '2026-10-02', lastDate: '2026-10-09', bestDate: '2026-10-09' });
    expect(bench.first1RM).toBeCloseTo(est1RM(50, 8));
    expect(bench.last1RM).toBeCloseTo(est1RM(60, 6));
    expect(t.exercises.find((e) => e.title === 'Plank')).toMatchObject({ longestSec: 75, days: 1, bestDate: '2026-10-02' });
    expect(t.muscles).toEqual([{ name: 'Chest', sets: 2 }, { name: 'Lats', sets: 2 }, { name: 'Abs', sets: 1 }]);
  });
  it('the best assisted set is the one with the least help', () => {
    expect(t.exercises.find((e) => e.title === 'Assisted Pull-up')).toMatchObject({ bestAssistKg: 20, bestAssistReps: 7, bestDate: '2026-10-09' });
  });
  it('last date counts exercises without a weight', () => {
    const d2: ReportData = { ...data, sessions: [...data.sessions, { id: 's3', name: 'Core', date: '2026-10-20', started_at: '', duration_sec: 600,
      sets: [set('plank', 0, null, { duration_sec: 90 })] }] };
    expect(reportTotals(d2).exercises.find((e) => e.title === 'Plank')).toMatchObject({ firstDate: '2026-10-02', lastDate: '2026-10-20', days: 2, bestDate: '2026-10-20' });
  });
});

describe('dates', () => {
  it('formats local dates, times and weeks', () => {
    expect(longDate('2026-11-02')).toBe('Mon 2 Nov 2026');
    expect(clockTime('2026-11-02T07:42:00')).toBe('7:42 am');
    expect(clockTime('2026-11-02T00:05:00')).toBe('12:05 am');
    expect(clockTime('')).toBe('');
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
    expect(weekLabel('2026-11-02')).toBe('2 – 8 Nov');
    expect(weekLabel('2026-09-28')).toBe('28 Sep – 4 Oct');
  });
});

describe('timeline', () => {
  it('puts workouts and Roams in the order they happened', () => {
    const items = timeline(data);
    expect(items.map((it) => (it.kind === 'workout' ? it.session.id : it.roam.name ?? it.roam.type))).toEqual(['s1', 'run', 's2', 'Commute']);
  });
  it('groups by week and by month with totals', () => {
    const weeks = byWeek(timeline(data));
    expect(weeks.map((w) => w.label)).toEqual(['28 Sep – 4 Oct', '5 – 11 Oct']);
    expect(weeks[1]).toMatchObject({ workouts: 1, workingSets: 3, volumeKg: 360, roams: 2, roamKm: 15 });
    expect(byMonth(timeline(data)).map((m) => m.label)).toEqual(['Oct 2026']);
  });
  it('names a Roam like the app, or by its type when the time is unknown', () => {
    expect(roamTitle(data.roams[0])).toBe('Morning Stride');
    expect(roamTitle({ ...data.roams[0], started_at: undefined })).toBe('Run');
    expect(roamTitle(data.roams[1])).toBe('Commute');
  });
});

describe('reportCsv', () => {
  const lines = reportCsv(data).trim().split('\n');
  // Quoted cells may hold commas: blank them before splitting.
  const col = (line: string, name: string) => line.replace(/"(?:[^"]|"")*"/g, 'x').split(',')[lines[0].split(',').indexOf(name)];
  it('has a header and one row per set and Roam, in the order they happened', () => {
    expect(lines[0]).toMatch(/^date,day,start_time,type,workout,workout_duration,exercise/);
    expect(lines).toHaveLength(1 + 6 + 2);
    expect(lines.slice(1).map((l) => l.split(',').slice(0, 4).join(' '))).toEqual([
      '2026-10-02 Fri 07:42 workout', '2026-10-02 Fri 07:42 workout', '2026-10-02 Fri 07:42 workout',
      '2026-10-09 Fri 06:50 run', '2026-10-09 Fri 18:15 workout', '2026-10-09 Fri 18:15 workout', '2026-10-09 Fri 18:15 workout',
      '2026-10-11 Sun  ride',
    ]);
  });
  it('marks warm-ups, records and assistance in plain words', () => {
    expect(lines[1]).toContain(',warm-up,10,40,');
    expect(col(lines[1], 'est_1rm_kg')).toBe('');
    expect(col(lines[2], 'volume_kg')).toBe('400');
    const pull = lines.find((l) => l.includes('Assisted Pull-up') && l.includes(',yes,'))!;
    expect(col(pull, 'assist_kg')).toBe('20');
    expect(col(lines[3], 'duration')).toBe('0:01:15');
  });
  it('quotes cells with commas and quotes', () => {
    expect(lines[1]).toContain('"Bench, ""Flat"" <b>"');
  });
  it('gives runs a pace and rides none', () => {
    const run = lines.find((l) => l.includes(',run,'))!;
    expect(col(run, 'workout')).toBe('Morning Stride');
    expect(col(run, 'pace_per_km')).toBe('5:00');
    expect(col(run, 'duration')).toBe('0:25:00');
    expect(col(lines.find((l) => l.includes('Commute'))!, 'pace_per_km')).toBe('');
  });
});

describe('reportHtml', () => {
  const range = reportRange('month', 0, new Date(2026, 9, 15));
  const t = reportTotals(data);
  it('escapes user text and includes the profile when asked', () => {
    const html = reportHtml(data, t, range, { includeProfile: true });
    expect(html).toContain('Bench, &quot;Flat&quot; &lt;b&gt;');
    expect(html).not.toContain('<b>"');
    expect(html).toContain('Injuries / limitations</span><b>knee');
    expect(html).toContain('<b>Build muscle</b>');
    expect(html).toContain('not medical advice');
  });
  const html = reportHtml(data, t, range, { includeProfile: false, generatedAt: new Date(2026, 9, 15, 14, 15) });
  it('dates the report and every workout and Roam', () => {
    expect(html).toContain('Thu 1 Oct 2026 – Sat 31 Oct 2026');
    expect(html).toContain('Generated Thu 15 Oct 2026, 2:15 pm');
    expect(html).toContain('Fri 2 Oct · 7:42 am</span><b>Push');
    expect(html).toContain('Fri 9 Oct · 6:50 am</span><b>Morning Stride');
    expect(html).toContain('Week of 5 – 11 Oct');
    expect(html.indexOf('Morning Stride</b>')).toBeLessThan(html.indexOf('Fri 9 Oct · 6:15 pm'));
  });
  it('lists records with their date and shows assistance', () => {
    expect(html).toMatch(/<h2>Records<\/h2>.*Fri 9 Oct<\/td><td class="b">Assisted Pull-up<\/td><td>7 <span class="m">−20 kg/s);
    expect(html).toContain('7 reps −20 kg');
  });
  it('has a calendar for a month and a week-by-week table', () => {
    expect(html).toContain('<table class="cal">');
    expect(html).toContain('<h2>Week by week</h2>');
    const year = reportHtml(data, t, reportRange('year', 0, new Date(2026, 9, 15)), { includeProfile: false });
    expect(year).not.toContain('class="cal"');
    expect(year).toContain('<h2>Month by month</h2>');
  });
  it('lists many sets in one cell instead of a column each', () => {
    const many: ReportData = { ...data, sessions: [{ ...data.sessions[0], sets: Array.from({ length: 8 }, (_, i) => set('bench', 5, 50, { set_index: i + 1 })) }] };
    const out = reportHtml(many, reportTotals(many), range, { includeProfile: false });
    expect(out).toContain('<th>Sets</th>');
    expect(out).not.toContain('<th>Set 7</th>');
  });
  it('leaves the profile out when the toggle is off', () => {
    expect(reportHtml(data, t, range, { includeProfile: false })).not.toContain('Injuries');
  });
});

describe('aiReportHtml', () => {
  it('shows the period as dates', () => {
    expect(aiReportHtml('Hi', { name: 'Asha', from: '2026-10-12', to: '2026-11-08', createdAt: '2026-11-09T09:00:00' }))
      .toContain('Last 4 weeks · Mon 12 Oct 2026 – Sun 8 Nov 2026');
  });
});

describe('markdownToHtml', () => {
  it('renders the coach’s subset and escapes HTML', () => {
    const html = markdownToHtml('## Summary\nGood **month**.\n\n1. Squat\n2. Row\n- <script>x</script>');
    expect(html).toBe('<h3>Summary</h3>\n<p>Good <b>month</b>.</p>\n<ol>\n<li>Squat</li>\n<li>Row</li>\n</ol>\n<ul>\n<li>&lt;script&gt;x&lt;/script&gt;</li>\n</ul>');
  });
});
