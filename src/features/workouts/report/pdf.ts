import type { ReportData, ReportProfile, ReportRoam, ReportSession, ReportSet } from '@/src/lib/api/reports';
import { thousands } from '@/src/features/plan/model';
import { clockDuration, clockTime, fromKey, longDate, shortDate, stamp, toKey, weekStart } from '@/src/features/workouts/report/dates';
import { esc, fmtDuration, markdownToHtml, num, paceText } from '@/src/features/workouts/report/formats';
import { type ExerciseLine, type ReportRange, type ReportTotals, est1RM } from '@/src/features/workouts/report/model';
import { type Period, type TimelineItem, byMonth, byWeek, roamKind, roamTitle, sessionVolume, timeline, workingSets } from '@/src/features/workouts/report/timeline';

// The printable report a coach or doctor reads: who and when, a calendar of
// training days, totals per week, records and exercises with their dates, then
// every workout and Roam in the order they happened. expo-print renders it to A4.

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 28px; font-size: 11px; line-height: 1.4; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
  h3 { font-size: 11px; margin: 14px 0 6px; color: #2f8a5c; text-transform: uppercase; letter-spacing: 0.5px; }
  h2, h3 { page-break-after: avoid; break-after: avoid; }
  .m { color: #666; } .r { text-align: right; } .b { font-weight: 600; }
  .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; border-bottom: 3px solid #5fc793; padding-bottom: 10px; }
  .brand { font-weight: 800; letter-spacing: 2px; color: #2f8a5c; font-size: 11px; }
  .prof { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; } .prof div { display: flex; flex-direction: column; } .prof b { font-size: 12px; }
  .tiles { display: flex; flex-wrap: wrap; gap: 6px; } .tile { flex: 1 0 90px; border: 1px solid #ddd; border-radius: 8px; padding: 6px 8px; }
  .tile b { display: block; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 5px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { font-size: 10px; color: #555; font-weight: 600; } tr { page-break-inside: avoid; }
  .pr { color: #b7791f; font-weight: 700; } .up { color: #2f8a5c; font-size: 10px; } .down { color: #c53030; font-size: 10px; }
  .tag { display: inline-block; background: #eee; color: #666; border-radius: 3px; padding: 0 3px; font-size: 9px; }
  .cal { table-layout: fixed; } .cal td { height: 44px; border: 1px solid #e5e5e5; font-size: 9px; overflow: hidden; }
  .cal td.out { background: #fafafa; } .dn { font-weight: 700; color: #999; font-size: 10px; }
  .cw, .cr { display: block; border-radius: 3px; padding: 1px 3px; margin-top: 2px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cw { background: #e3f5ec; color: #22704a; } .cr { background: #e6effc; color: #2b5797; }
  .entry { border: 1px solid #e3e3e3; border-left: 4px solid #5fc793; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .entry.roam { border-left-color: #6b9be0; }
  .eh { display: flex; justify-content: space-between; align-items: baseline; gap: 4px 10px; flex-wrap: wrap; margin-bottom: 4px; }
  .eh b { font-size: 13px; } .when { display: inline-block; min-width: 118px; color: #2f8a5c; font-weight: 700; }
  .chip { font-size: 9px; background: #e6effc; color: #2b5797; border-radius: 10px; padding: 1px 6px; margin-left: 4px; }
  .sets td { font-variant-numeric: tabular-nums; }
  footer { margin-top: 22px; font-size: 9px; color: #777; border-top: 1px solid #ddd; padding-top: 8px; }
`;

/** Above this many sets of one exercise in a workout, sets are listed in one cell instead of a column each. */
const MAX_SET_COLUMNS = 6;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function profileHtml(p: ReportProfile): string {
  const rows: [string, string][] = [];
  if (p.first_name) rows.push(['Name', p.first_name]);
  if (p.age !== undefined) rows.push(['Age', String(p.age)]);
  if (p.gender) rows.push(['Sex', capital(p.gender)]);
  if (p.height_cm) rows.push(['Height', `${num(p.height_cm, 0)} cm`]);
  if (p.weight_kg) rows.push(['Weight', `${num(p.weight_kg)} kg`]);
  if (p.target_weight_kg) rows.push(['Target weight', `${num(p.target_weight_kg)} kg`]);
  if (p.goal) rows.push(['Goal', capital(p.goal)]);
  if (p.experience) rows.push(['Experience', capital(p.experience)]);
  if (p.injuries?.length) rows.push(['Injuries / limitations', p.injuries.join(', ')]);
  if (!rows.length) return '';
  return `<div class="prof">${rows.map(([k, v]) => `<div><span class="m">${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
}

/** One set as short text: '60 × 8', '8 −25 kg', '1:15', '15:00 · 2.1 km'. */
function setValue(tracking: string, s: ReportSet): string {
  if (tracking === 'cardio') {
    return [s.duration_sec ? clockDuration(s.duration_sec) : '', s.distance_m ? `${num(s.distance_m / 1000, 2)} km` : ''].filter(Boolean).join(' · ') || '–';
  }
  if (tracking === 'duration') return `${clockDuration(s.duration_sec ?? 0)}${s.weight_kg ? ` +${num(s.weight_kg, 2)} kg` : ''}`;
  if (tracking === 'assisted_reps') {
    const help = s.assist_kg === null || s.assist_kg === undefined ? '' : s.assist_kg === 0 ? ' <span class="m">no help</span>' : ` <span class="m">−${num(s.assist_kg, 2)} kg</span>`;
    return `${s.reps}${help}`;
  }
  if (tracking === 'weight_distance') return `${num(s.weight_kg ?? 0, 2)} kg · ${Math.round(s.distance_m ?? 0)} m`;
  if (tracking === 'reps' && s.weight_kg) return `${s.reps} +${num(s.weight_kg, 2)} kg`;
  return s.weight_kg ? `${num(s.weight_kg, 2)} × ${s.reps}` : `${s.reps} reps`;
}

function setCell(tracking: string, s: ReportSet): string {
  return `${s.is_warmup ? '<span class="tag">W</span> ' : ''}${setValue(tracking, s)}${s.rpe ? ` <span class="m">@${s.rpe}</span>` : ''}${s.is_pr ? ' <span class="pr">★</span>' : ''}`;
}

function workoutHtml(d: ReportData, s: ReportSession): string {
  const byEx = new Map<string, ReportSet[]>();
  for (const st of s.sets) byEx.set(st.exercise_uuid, [...(byEx.get(st.exercise_uuid) ?? []), st]);
  const most = Math.max(0, ...[...byEx.values()].map((l) => l.length));
  const columns = most <= MAX_SET_COLUMNS;
  const head = columns
    ? `<tr><th>Exercise</th>${Array.from({ length: most }, (_, i) => `<th>Set ${i + 1}</th>`).join('')}<th class="r">Best e1RM</th></tr>`
    : '<tr><th>Exercise</th><th>Sets</th><th class="r">Best e1RM</th></tr>';
  const rows = [...byEx].map(([uuid, list]) => {
    const ex = d.exercises[uuid];
    const tracking = ex?.tracking_type ?? 'weight_reps';
    const best = Math.max(0, ...workingSets(list).map((x) => est1RM(x.weight_kg, x.reps)));
    const cells = columns
      ? Array.from({ length: most }, (_, i) => `<td>${list[i] ? setCell(tracking, list[i]) : ''}</td>`).join('')
      : `<td>${list.map((x) => setCell(tracking, x)).join(' &nbsp;·&nbsp; ')}</td>`;
    return `<tr><td class="b">${esc(ex?.title ?? 'Exercise')}</td>${cells}<td class="r">${best ? `${num(best)} kg` : ''}</td></tr>`;
  }).join('');
  const prs = s.sets.filter((x) => x.is_pr).length;
  const volume = sessionVolume(s.sets);
  const facts = [fmtDuration(s.duration_sec), `${workingSets(s.sets).length} working sets`, volume ? `${thousands(volume)} kg` : '', prs ? `<span class="pr">${prs} ★</span>` : '']
    .filter(Boolean).join(' · ');
  const time = clockTime(s.started_at);
  return `<div class="entry"><div class="eh"><div><span class="when">${shortDate(s.date)}${time ? ` · ${time}` : ''}</span><b>${esc(s.name)}</b></div>
<div class="m">${facts}</div></div>${rows ? `<table class="sets">${head}${rows}</table>` : '<div class="m">No sets logged.</div>'}</div>`;
}

function roamHtml(r: ReportRoam): string {
  const speed = r.type === 'cycle'
    ? (r.moving_time_sec ? `${num(r.distance_m / r.moving_time_sec * 3.6)} km/h` : '')
    : (r.avg_pace_sec_per_km ? `${paceText(r.avg_pace_sec_per_km)} /km` : '');
  const facts = [`${num(r.distance_m / 1000, 2)} km`, `${fmtDuration(r.moving_time_sec)} moving`, speed,
    r.elevation_gain_m ? `+${num(r.elevation_gain_m, 0)} m` : '', r.steps ? `${thousands(r.steps)} steps` : ''].filter(Boolean).join(' · ');
  const time = clockTime(r.started_at);
  return `<div class="entry roam"><div class="eh"><div><span class="when">${shortDate(r.date)}${time ? ` · ${time}` : ''}</span><b>${esc(roamTitle(r))}</b><span class="chip">Roam · ${roamKind(r)}</span></div>
<div class="m">${facts}</div></div></div>`;
}

const itemHtml = (d: ReportData, it: TimelineItem) => (it.kind === 'workout' ? workoutHtml(d, it.session) : roamHtml(it.roam));

/** A Mon–Sun grid of the range, each day listing what was done (week and month reports). */
function calendarHtml(range: ReportRange, items: TimelineItem[]): string {
  const byDay = new Map<string, string[]>();
  for (const it of items) {
    const label = it.kind === 'workout'
      ? `<span class="cw">${esc(it.session.name)}</span>`
      : `<span class="cr">${roamKind(it.roam)} ${num(it.roam.distance_m / 1000)} km</span>`;
    byDay.set(it.date, [...(byDay.get(it.date) ?? []), label]);
  }
  const rows: string[] = [];
  const day = fromKey(weekStart(range.from));
  const last = fromKey(range.to);
  while (day <= last) {
    const cells: string[] = [];
    for (let i = 0; i < 7; i++) {
      const key = toKey(day);
      const inRange = key >= range.from && key <= range.to;
      cells.push(inRange ? `<td><div class="dn">${day.getDate()}</div>${(byDay.get(key) ?? []).join('')}</td>` : '<td class="out"></td>');
      day.setDate(day.getDate() + 1);
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return `<table class="cal"><tr>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<th>${x}</th>`).join('')}</tr>${rows.join('')}</table>`;
}

function periodsHtml(title: string, periods: Period[]): string {
  if (!periods.length) return '';
  const rows = periods.map((p) => `<tr><td class="b">${esc(p.label)}</td><td>${p.workouts}</td><td>${p.workingSets}</td><td>${p.volumeKg ? `${thousands(p.volumeKg)} kg` : '–'}</td>
<td>${p.durationSec ? fmtDuration(p.durationSec) : '–'}</td><td>${p.roams ? `${p.roams} · ${num(p.roamKm)} km` : '–'}</td></tr>`).join('');
  return `<h2>${title}</h2><table><tr><th>${title === 'Month by month' ? 'Month' : 'Week'}</th><th>Workouts</th><th>Working sets</th><th>Volume</th><th>Time</th><th>Roams</th></tr>${rows}</table>`;
}

function recordsHtml(d: ReportData, items: TimelineItem[]): string {
  const rows: string[] = [];
  for (const it of items) {
    if (it.kind !== 'workout') continue;
    for (const st of it.session.sets) {
      if (!st.is_pr) continue;
      const ex = d.exercises[st.exercise_uuid];
      rows.push(`<tr><td>${shortDate(it.date)}</td><td class="b">${esc(ex?.title ?? 'Exercise')}</td><td>${setValue(ex?.tracking_type ?? 'weight_reps', st)}</td><td class="m">${esc(it.session.name)}</td></tr>`);
    }
  }
  return rows.length ? `<h2>Records</h2><table><tr><th>Date</th><th>Exercise</th><th>Set</th><th>Workout</th></tr>${rows.join('')}</table>` : '';
}

function bestText(e: ExerciseLine): string {
  if (e.bestWeightKg) return `${num(e.bestWeightKg, 2)} kg × ${e.bestReps}`;
  if (e.bestAssistKg !== null) return `${e.bestAssistReps} reps ${e.bestAssistKg ? `−${num(e.bestAssistKg, 2)} kg` : 'no help'}`;
  if (e.longestSec) return `${clockDuration(e.longestSec)}${e.distanceM ? ` · ${num(e.distanceM / 1000, 2)} km total` : ''}`;
  return e.bestReps ? `${e.bestReps} reps` : '';
}

function exercisesHtml(t: ReportTotals): string {
  if (!t.exercises.length) return '';
  const rows = t.exercises.map((e) => {
    const best = bestText(e);
    const up = e.last1RM > e.first1RM;
    const change = e.first1RM && e.last1RM && e.first1RM !== e.last1RM
      ? `${num(e.first1RM)} → ${num(e.last1RM)} kg <span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${num(Math.abs(e.last1RM - e.first1RM))}</span>`
      : e.best1RM ? `${num(e.best1RM)} kg` : '';
    const done = `${e.days} ${e.days === 1 ? 'day' : 'days'} · ${e.sets} ${e.sets === 1 ? 'set' : 'sets'}`;
    return `<tr><td class="b">${esc(e.title)}</td><td>${done}</td><td>${best}${best ? `<div class="m">${shortDate(e.bestDate)}</div>` : ''}</td><td>${change}</td>
<td>${shortDate(e.firstDate)}</td><td>${shortDate(e.lastDate)}</td></tr>`;
  }).join('');
  return `<h2>Exercises</h2><table><tr><th>Exercise</th><th>Done</th><th>Best set</th><th>Est. 1RM (first → last)</th><th>First</th><th>Last</th></tr>${rows}</table>`;
}

/** The printable report: header, summary, calendar, week/month totals, records, exercises, muscles, activity log. */
export function reportHtml(d: ReportData, t: ReportTotals, range: ReportRange, opts: { includeProfile: boolean; generatedAt?: Date }): string {
  const name = d.profile.first_name ? `${esc(d.profile.first_name)}’s training report` : 'Training report';
  const items = timeline(d);
  const weeks = byWeek(items);
  const tiles: [string, string][] = [
    ['Workouts', String(t.workouts)], ['Training days', String(t.trainingDays)], ['Time', fmtDuration(t.durationSec)],
    ['Working sets', String(t.workingSets)], ['Volume', `${thousands(t.volumeKg)} kg`], ['Records', String(t.prs)],
    ['Roams', `${t.roams} · ${num(t.roamKm)} km`],
  ];
  const log = range.kind === 'week'
    ? items.map((it) => itemHtml(d, it)).join('')
    : weeks.map((w) => `<h3>Week of ${esc(w.label)}</h3>${w.items.map((it) => itemHtml(d, it)).join('')}`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>${CSS}</style></head><body>
<div class="top"><div><div class="brand">FITNYX</div><h1>${name}</h1><div class="m">${range.kind === 'week' ? '' : `${esc(range.label)} · `}${longDate(d.from)} – ${longDate(d.to)}</div></div>
<div class="m r">Generated ${stamp(opts.generatedAt ?? new Date())}<br>Times are in this phone’s time zone</div></div>
${opts.includeProfile ? profileHtml(d.profile) : ''}
<h2>Summary</h2><div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><span class="m">${k}</span><b>${v}</b></div>`).join('')}</div>
${range.kind === 'year' ? periodsHtml('Month by month', byMonth(items)) : `<h2>Calendar</h2>${calendarHtml(range, items)}`}
${range.kind === 'month' ? periodsHtml('Week by week', weeks) : ''}
${recordsHtml(d, items)}
${exercisesHtml(t)}
${t.muscles.length ? `<h2>Working sets per muscle</h2><p>${t.muscles.map((m) => `${esc(m.name)} <b>${m.sets}</b>`).join(' · ')}</p>` : ''}
<h2>Activity log</h2>${items.length ? log : '<p class="m">Nothing logged in this period.</p>'}
<footer><b>Key:</b> W = warm-up (not counted in totals) · ★ = personal record · @8.5 = RPE · 60 × 8 = kg × reps · −25 kg = machine assistance (less is better).<br>
Est. 1RM = Epley formula, working sets of 1–12 reps. Records = a working set heavier than any before it, or with less assistance. This report is a training log, not medical advice. Generated by FitNyx.</footer>
</body></html>`;
}

export function aiReportHtml(md: string, meta: { name?: string; from: string; to: string; createdAt: string }): string {
  const title = meta.name ? `${esc(meta.name)}’s AI training report` : 'AI training report';
  const when = stamp(new Date(meta.createdAt));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS} li { margin: 3px 0; }</style></head><body>
<div class="top"><div><div class="brand">FITNYX</div><h1>${title}</h1><div class="m">Last 4 weeks · ${longDate(meta.from)} – ${longDate(meta.to)}</div></div>
<div class="m r">Written ${when}<br>by the FitNyx coach</div></div>
${markdownToHtml(md)}
<footer>Written by an AI coach from your FitNyx training data. It is coaching, not medical advice.</footer>
</body></html>`;
}
