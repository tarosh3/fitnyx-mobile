import type { ReportData } from '@/src/lib/api/reports';
import { clock24, hms, weekday } from '@/src/features/workouts/report/dates';
import { est1RM } from '@/src/features/workouts/report/model';
import { roamKind, roamTitle, timeline } from '@/src/features/workouts/report/timeline';

// Shared text helpers, the CSV export (every set + Roam, for spreadsheets) and
// the AI report's Markdown → HTML. The PDF lives in pdf.ts.

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const num = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? '' : String(Number(v.toFixed(digits))));

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}

/** 334 → '5:34' */
export const paceText = (sec: number | null) => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '');

// --- CSV ---

const CSV_HEADER = ['date', 'day', 'start_time', 'type', 'workout', 'workout_duration', 'exercise', 'muscles', 'set', 'set_type', 'reps',
  'weight_kg', 'assist_kg', 'duration', 'distance_km', 'volume_kg', 'est_1rm_kg', 'rpe', 'rest_sec', 'record', 'pace_per_km',
  'elevation_gain_m', 'steps'];

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * One row per set and per Roam, in the order they happened. Dates are
 * YYYY-MM-DD and times 24 h in the phone's time zone; durations are h:mm:ss,
 * which spreadsheets read as time.
 */
export function reportCsv(d: ReportData): string {
  const rows: (string | number | null | undefined)[][] = [];
  for (const it of timeline(d)) {
    if (it.kind === 'workout') {
      const s = it.session;
      for (const st of s.sets) {
        const ex = d.exercises[st.exercise_uuid];
        const e = st.is_warmup ? 0 : est1RM(st.weight_kg, st.reps);
        rows.push([s.date, weekday(s.date), clock24(s.started_at), 'workout', s.name, hms(s.duration_sec), ex?.title ?? 'Exercise',
          (ex?.primary_muscles ?? []).join(' / '), st.set_index, st.is_warmup ? 'warm-up' : 'working', st.reps || '',
          num(st.weight_kg, 2), num(st.assist_kg, 2), st.duration_sec ? hms(st.duration_sec) : '',
          st.distance_m ? num(st.distance_m / 1000, 3) : '', !st.is_warmup && st.weight_kg ? num(st.weight_kg * st.reps, 1) : '',
          e ? num(e) : '', st.rpe, st.rest_sec, st.is_pr ? 'yes' : '', '', '', '']);
      }
    } else {
      const r = it.roam;
      rows.push([r.date, weekday(r.date), clock24(r.started_at), roamKind(r).toLowerCase(), roamTitle(r), hms(r.elapsed_time_sec), '', '', '', '', '',
        '', '', hms(r.moving_time_sec), num(r.distance_m / 1000, 2), '', '', '', '', '', r.type === 'cycle' ? '' : paceText(r.avg_pace_sec_per_km),
        num(r.elevation_gain_m, 0), r.steps]);
    }
  }
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

// --- AI report (Markdown → HTML) ---

function inline(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>');
}

/** The small Markdown subset the coach writes: headings, lists, bold/italic, paragraphs. */
export function markdownToHtml(md: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    const ul = /^[-*•]\s+(.*)$/.exec(line);
    if (!line) { close(); continue; }
    if (h) { close(); out.push(`<h${Math.min(h[1].length + 1, 4)}>${inline(h[2])}</h${Math.min(h[1].length + 1, 4)}>`); continue; }
    if (ol || ul) {
      const kind = ol ? 'ol' : 'ul';
      if (list !== kind) { close(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline((ol ?? ul)![1])}</li>`);
      continue;
    }
    close();
    out.push(`<p>${inline(line)}</p>`);
  }
  close();
  return out.join('\n');
}
