import type { ReportData, ReportProfile } from '@/src/lib/api/reports';
import { type ReportRange, type ReportTotals, est1RM } from '@/src/features/workouts/report/model';

// Export formats: CSV (every set + Roam, for spreadsheets), printable HTML for
// the PDF (a doctor / coach reads it), and the AI report's Markdown as HTML.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? '' : String(Number(v.toFixed(digits))));

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}

const pace = (sec: number | null) => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}/km` : '');

// --- CSV ---

const CSV_HEADER = ['date', 'kind', 'activity', 'exercise', 'tracking', 'set', 'reps', 'weight_kg', 'est_1rm_kg', 'duration_sec',
  'distance_m', 'rest_sec', 'rpe', 'warmup', 'record', 'pace_per_km', 'elevation_gain_m', 'steps'];

function csvCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per set and per Roam, oldest first. */
export function reportCsv(d: ReportData): string {
  const rows: (string | number | boolean | null)[][] = [];
  for (const s of d.sessions) {
    for (const st of s.sets) {
      const ex = d.exercises[st.exercise_uuid];
      const e = est1RM(st.weight_kg, st.reps);
      rows.push([s.date, 'workout', s.name, ex?.title ?? 'Exercise', ex?.tracking_type ?? '', st.set_index, st.reps, num(st.weight_kg, 2),
        e ? num(e) : '', st.duration_sec, st.distance_m, st.rest_sec, st.rpe, st.is_warmup, st.is_pr, '', '', '']);
    }
  }
  for (const r of d.roams) {
    rows.push([r.date, 'roam', r.name ?? r.type, '', r.type, '', '', '', '', r.moving_time_sec, num(r.distance_m, 0), '', '', '', '',
      r.type === 'cycle' ? '' : pace(r.avg_pace_sec_per_km), num(r.elevation_gain_m, 0), r.steps]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

// --- PDF (HTML) ---

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 32px; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0; } h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 14px 0 4px; }
  .muted { color: #666; } .tiles { display: flex; flex-wrap: wrap; gap: 8px; }
  .tile { border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; min-width: 110px; }
  .tile b { display: block; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; page-break-inside: auto; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { font-size: 11px; color: #555; } tr { page-break-inside: avoid; }
  .pr { color: #b7791f; font-weight: 600; } footer { margin-top: 28px; font-size: 10px; color: #777; }
`;

function profileHtml(p: ReportProfile): string {
  const rows: [string, string][] = [];
  if (p.first_name) rows.push(['Name', p.first_name]);
  if (p.age !== undefined) rows.push(['Age', String(p.age)]);
  if (p.gender) rows.push(['Sex', p.gender]);
  if (p.height_cm) rows.push(['Height', `${num(p.height_cm, 0)} cm`]);
  if (p.weight_kg) rows.push(['Weight', `${num(p.weight_kg)} kg`]);
  if (p.target_weight_kg) rows.push(['Target weight', `${num(p.target_weight_kg)} kg`]);
  if (p.goal) rows.push(['Goal', p.goal]);
  if (p.experience) rows.push(['Experience', p.experience]);
  if (p.injuries?.length) rows.push(['Injuries / limitations', p.injuries.join(', ')]);
  if (!rows.length) return '';
  return `<h2>Profile</h2><table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
}

function setText(t: string, s: ReportData['sessions'][number]['sets'][number]): string {
  if (t === 'cardio') return [s.duration_sec ? fmtDuration(s.duration_sec) : '', s.distance_m ? `${num(s.distance_m / 1000, 2)} km` : ''].filter(Boolean).join(' · ');
  if (t === 'duration') return s.duration_sec ? fmtDuration(s.duration_sec) : '';
  return s.weight_kg ? `${num(s.weight_kg, 2)} kg × ${s.reps}` : `${s.reps} reps`;
}

/** A printable report: summary, progress per exercise, muscle balance, every workout and Roam. */
export function reportHtml(d: ReportData, t: ReportTotals, range: ReportRange, opts: { includeProfile: boolean; generatedAt?: Date }): string {
  const name = d.profile.first_name ? `${esc(d.profile.first_name)}’s training report` : 'Training report';
  const tiles: [string, string][] = [
    ['Workouts', String(t.workouts)], ['Training days', String(t.trainingDays)], ['Time', fmtDuration(t.durationSec)],
    ['Sets', String(t.sets)], ['Volume', `${Math.round(t.volumeKg).toLocaleString('en-US')} kg`], ['Records', String(t.prs)],
    ['Roams', `${t.roams} · ${num(t.roamKm)} km`],
  ];
  const exRows = t.exercises.map((e) => {
    const best = e.bestWeightKg ? `${num(e.bestWeightKg, 2)} kg × ${e.bestReps}` : e.longestSec ? fmtDuration(e.longestSec) : e.bestReps ? `${e.bestReps} reps` : '';
    const change = e.first1RM && e.last1RM && e.first1RM !== e.last1RM ? `${num(e.first1RM)} → ${num(e.last1RM)} kg` : e.best1RM ? `${num(e.best1RM)} kg` : '';
    return `<tr><td>${esc(e.title)}</td><td>${e.sets}</td><td>${esc(best)}</td><td>${change}</td><td>${e.distanceM ? `${num(e.distanceM / 1000, 2)} km` : ''}</td><td>${e.prs ? `<span class="pr">${e.prs}</span>` : ''}</td></tr>`;
  }).join('');
  const workouts = d.sessions.map((s) => {
    const byEx = new Map<string, string[]>();
    for (const st of s.sets) {
      const ex = d.exercises[st.exercise_uuid];
      const txt = `${setText(ex?.tracking_type ?? 'weight_reps', st)}${st.is_warmup ? ' (warm-up)' : ''}${st.rpe ? ` @RPE ${st.rpe}` : ''}${st.is_pr ? ' <span class="pr">PR</span>' : ''}`;
      byEx.set(ex?.title ?? 'Exercise', [...(byEx.get(ex?.title ?? 'Exercise') ?? []), txt]);
    }
    const lines = [...byEx].map(([n, list]) => `<tr><td>${esc(n)}</td><td>${list.join(', ')}</td></tr>`).join('');
    return `<h3>${esc(s.date)} · ${esc(s.name)} <span class="muted">· ${fmtDuration(s.duration_sec)}</span></h3><table>${lines}</table>`;
  }).join('');
  const roams = d.roams.map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.name ?? r.type)}</td><td>${num(r.distance_m / 1000, 2)} km</td><td>${fmtDuration(r.moving_time_sec)}</td><td>${r.type === 'cycle' ? (r.moving_time_sec ? `${num(r.distance_m / 1000 / (r.moving_time_sec / 3600))} km/h` : '') : pace(r.avg_pace_sec_per_km)}</td><td>${r.elevation_gain_m ? `+${num(r.elevation_gain_m, 0)} m` : ''}</td></tr>`).join('');
  const when = (opts.generatedAt ?? new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>${CSS}</style></head><body>
<h1>${name}</h1><div class="muted">${esc(range.label)} (${d.from} to ${d.to})</div>
${opts.includeProfile ? profileHtml(d.profile) : ''}
<h2>Summary</h2><div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><span class="muted">${k}</span><b>${v}</b></div>`).join('')}</div>
${t.exercises.length ? `<h2>Exercises</h2><table><tr><th>Exercise</th><th>Sets</th><th>Best set</th><th>Est. 1RM</th><th>Distance</th><th>Records</th></tr>${exRows}</table>` : ''}
${t.muscles.length ? `<h2>Working sets per muscle</h2><p>${t.muscles.map((m) => `${esc(m.name)} ${m.sets}`).join(' · ')}</p>` : ''}
${d.sessions.length ? `<h2>Workouts</h2>${workouts}` : '<h2>Workouts</h2><p class="muted">No workouts in this period.</p>'}
${d.roams.length ? `<h2>Roams</h2><table><tr><th>Date</th><th>Activity</th><th>Distance</th><th>Moving time</th><th>Pace / speed</th><th>Climb</th></tr>${roams}</table>` : ''}
<footer>Generated by FitNyx on ${when}. Est. 1RM = Epley formula, sets of 1–12 reps. Records = a working set heavier than any before it. This report is a training log, not medical advice.</footer>
</body></html>`;
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

export function aiReportHtml(md: string, meta: { name?: string; from: string; to: string; createdAt: string }): string {
  const title = meta.name ? `${esc(meta.name)}’s AI training report` : 'AI training report';
  const when = new Date(meta.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS} li { margin: 3px 0; }</style></head><body>
<h1>${title}</h1><div class="muted">Last 4 weeks (${meta.from} to ${meta.to}) · written ${when} by the FitNyx coach</div>
${markdownToHtml(md)}
<footer>Written by an AI coach from your FitNyx training data. It is coaching, not medical advice.</footer>
</body></html>`;
}
