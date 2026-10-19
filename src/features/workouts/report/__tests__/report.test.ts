import { markdownToHtml, reportCsv, reportHtml } from '@/src/features/workouts/report/formats';
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
  },
  sessions: [
    { id: 's1', name: 'Push', date: '2026-10-02', started_at: '', duration_sec: 3000, sets: [
      set('bench', 10, 40, { is_warmup: true }), set('bench', 8, 50), set('plank', 0, null, { duration_sec: 60 }),
    ] },
    { id: 's2', name: 'Push', date: '2026-10-09', started_at: '', duration_sec: 3600, sets: [set('bench', 6, 60, { is_pr: true })] },
  ],
  roams: [
    { date: '2026-10-09', type: 'run', name: null, distance_m: 5000, moving_time_sec: 1500, elapsed_time_sec: 1600, avg_pace_sec_per_km: 300, elevation_gain_m: 12, steps: 5000 },
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
    expect(t).toMatchObject({ workouts: 2, trainingDays: 3, sets: 4, volumeKg: 760, prs: 1, roams: 2, roamKm: 15 });
  });
  it('tracks progress per exercise within the range', () => {
    const bench = t.exercises[0];
    expect(bench).toMatchObject({ title: 'Bench, "Flat" <b>', sets: 3, bestWeightKg: 60, bestReps: 6, prs: 1 });
    expect(bench.first1RM).toBeCloseTo(est1RM(50, 8));
    expect(bench.last1RM).toBeCloseTo(est1RM(60, 6));
    expect(t.exercises[1]).toMatchObject({ title: 'Plank', longestSec: 60 });
    expect(t.muscles).toEqual([{ name: 'Chest', sets: 2 }, { name: 'Abs', sets: 1 }]);
  });
});

describe('reportCsv', () => {
  const lines = reportCsv(data).trim().split('\n');
  it('has a header and one row per set and Roam, by date', () => {
    expect(lines[0]).toMatch(/^date,kind,activity,exercise/);
    expect(lines).toHaveLength(1 + 4 + 2);
    expect(lines.map((l) => l.slice(0, 10)).slice(1)).toEqual(['2026-10-02', '2026-10-02', '2026-10-02', '2026-10-09', '2026-10-09', '2026-10-11']);
  });
  it('quotes cells with commas and quotes', () => {
    expect(lines[1]).toContain('"Bench, ""Flat"" <b>"');
  });
  it('gives runs a pace and rides none', () => {
    expect(lines.find((l) => l.includes(',roam,') && l.includes('run'))).toContain('5:00/km');
    expect(lines.find((l) => l.includes('Commute'))).not.toContain('/km');
  });
});

describe('reportHtml', () => {
  const range = reportRange('month', 0, new Date(2026, 9, 15));
  const t = reportTotals(data);
  it('escapes user text and includes the profile when asked', () => {
    const html = reportHtml(data, t, range, { includeProfile: true });
    expect(html).toContain('Bench, &quot;Flat&quot; &lt;b&gt;');
    expect(html).not.toContain('<b>"');
    expect(html).toContain('Injuries / limitations</th><td>knee');
    expect(html).toContain('not medical advice');
  });
  it('leaves the profile out when the toggle is off', () => {
    expect(reportHtml(data, t, range, { includeProfile: false })).not.toContain('Injuries');
  });
});

describe('markdownToHtml', () => {
  it('renders the coach’s subset and escapes HTML', () => {
    const html = markdownToHtml('## Summary\nGood **month**.\n\n1. Squat\n2. Row\n- <script>x</script>');
    expect(html).toBe('<h3>Summary</h3>\n<p>Good <b>month</b>.</p>\n<ol>\n<li>Squat</li>\n<li>Row</li>\n</ol>\n<ul>\n<li>&lt;script&gt;x&lt;/script&gt;</li>\n</ul>');
  });
});
