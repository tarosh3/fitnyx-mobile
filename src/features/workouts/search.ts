import { equipmentLabel } from '@/src/features/workouts/finder';
import { partLabel, partOf } from '@/src/features/workouts/model';
import type { Exercise } from '@/src/types/exercise';

/**
 * On-device fuzzy search over the exercise catalog. Matches the title, muscles,
 * body part and equipment, tolerates typos (small edit distance), and expands a
 * few gym synonyms ("delts" → shoulder, "abs" → core). Pure and ranked, so the
 * library can search instantly and offline without hitting the backend.
 */

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common gym terms → words that actually appear in the catalog's fields.
const SYNONYMS: Record<string, string[]> = {
  delt: ['shoulder'], delts: ['shoulder'], deltoid: ['shoulder'], deltoids: ['shoulder'],
  pec: ['chest'], pecs: ['chest'], pecks: ['chest'],
  ab: ['abs', 'core'], abs: ['core'], core: ['abs'],
  lat: ['lats', 'back'], lats: ['back'],
  glute: ['glutes'], glutes: ['legs'], ham: ['hamstring'], hams: ['hamstring'], hammies: ['hamstring'],
  quad: ['quads'], quads: ['legs'], calf: ['calves'], calves: ['legs'],
  bi: ['biceps', 'arms'], bis: ['biceps'], bicep: ['biceps', 'arms'],
  tri: ['triceps', 'arms'], tris: ['triceps'], tricep: ['triceps', 'arms'],
  traps: ['back'], db: ['dumbbell'], bb: ['barbell'], kb: ['kettlebell'],
  bodyweight: ['bodyweight'], bw: ['bodyweight'], cardio: ['cardio'],
};

/** Levenshtein distance, early-exits once it exceeds `max` (returns max + 1). */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function isSubsequence(token: string, text: string): boolean {
  let i = 0;
  for (let j = 0; j < text.length && i < token.length; j++) {
    if (text[j] === token[i]) i++;
  }
  return i === token.length;
}

interface Fields {
  title: string;
  words: string[];
  muscles: string;
  part: string;
  equipment: string;
}

function fieldsOf(ex: Exercise): Fields {
  const title = norm(ex.title ?? '');
  const muscles = norm(
    [...(ex.primary_muscles ?? []), ...(ex.secondary_muscles ?? [])].map((m) => m.name).join(' '),
  );
  const part = norm(partLabel(partOf(ex)));
  const equipment = norm([equipmentLabel(ex) ?? '', ...(ex.equipment ?? []).map((e) => e.name)].join(' '));
  return { title, words: title.split(' ').filter(Boolean), muscles, part, equipment };
}

/** Best score for one query token across an exercise's fields; 0 = no match. */
function scoreToken(token: string, f: Fields): number {
  const variants = [token, ...(SYNONYMS[token] ?? [])];
  let best = 0;
  for (const v of variants) {
    if (!v) continue;
    if (f.title.includes(v)) best = Math.max(best, f.title.startsWith(v) ? 120 : 100);
    for (const w of f.words) {
      if (w.startsWith(v)) { best = Math.max(best, 90); break; }
    }
    if (f.muscles.includes(v)) best = Math.max(best, 45);
    if (f.part.includes(v) || (v.length >= 3 && v.includes(f.part) && f.part)) best = Math.max(best, 40);
    if (f.equipment.includes(v)) best = Math.max(best, 35);
    if (best < 60 && v.length >= 4) {
      // Typo tolerance against title words.
      const max = v.length <= 5 ? 1 : 2;
      for (const w of f.words) {
        if (Math.abs(w.length - v.length) > max) continue;
        const d = editDistance(v, w, max);
        if (d <= max) { best = Math.max(best, 60 - d * 12); break; }
      }
    }
    if (best < 25 && v.length >= 4 && isSubsequence(v, f.title)) best = Math.max(best, 25);
  }
  return best;
}

/**
 * Rank the catalog against a query. Every query token must match something
 * (AND), results are sorted by total relevance then title. An empty query
 * returns the catalog sorted by title.
 */
export function searchExercises(catalog: Exercise[], rawQuery: string): Exercise[] {
  const q = norm(rawQuery);
  if (!q) return [...catalog].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  const tokens = q.split(' ').filter(Boolean);

  const scored: { ex: Exercise; score: number }[] = [];
  for (const ex of catalog) {
    const f = fieldsOf(ex);
    let total = 0;
    let allMatched = true;
    for (const t of tokens) {
      const s = scoreToken(t, f);
      if (s === 0) { allMatched = false; break; }
      total += s;
    }
    if (!allMatched) continue;
    if (f.title.includes(q)) total += 150; // whole-phrase bonus
    scored.push({ ex, score: total });
  }

  scored.sort((a, b) => b.score - a.score || (a.ex.title ?? '').localeCompare(b.ex.title ?? ''));
  return scored.map((s) => s.ex);
}
