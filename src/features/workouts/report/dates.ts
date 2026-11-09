// Date and time text for the exports. Dates are local YYYY-MM-DD keys (the
// workout's own day from the server); times come from ISO timestamps and are
// shown in the phone's time zone. No Intl: Hermes builds differ.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-11-02' → local Date at midnight. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'Mon' */
export const weekday = (key: string) => DAYS[fromKey(key).getDay()];
/** 'Mon 2 Nov' */
export function shortDate(key: string): string {
  const d = fromKey(key);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
/** 'Mon 2 Nov 2026' */
export const longDate = (key: string) => `${shortDate(key)} ${fromKey(key).getFullYear()}`;
/** 'Nov' */
export const monthName = (month: number) => MONTHS[month];

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** '7:42 am', or '' when unknown. */
export function clockTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return '';
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** '07:42' (sorts and parses in spreadsheets), or '' when unknown. */
export function clock24(iso: string | null | undefined): string {
  const d = parse(iso);
  return d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
}

/** Milliseconds for ordering, 0 when unknown. */
export const timeOf = (iso: string | null | undefined) => parse(iso)?.getTime() ?? 0;

/** 'Mon 9 Nov 2026, 2:15 pm' */
export function stamp(d: Date): string {
  return `${longDate(toKey(d))}, ${clockTime(d.toISOString())}`;
}

/** The Monday of the week holding `key`, as a key. */
export function weekStart(key: string): string {
  const d = fromKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toKey(d);
}

/** '2 – 8 Nov', '28 Sep – 4 Oct' for the week starting on `startKey`. */
export function weekLabel(startKey: string): string {
  const s = fromKey(startKey);
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]}`
    : `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;
}

/** 75 → '1:15'; 3725 → '1:02:05'. */
export function clockDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Always h:mm:ss, which spreadsheets read as a duration: 75 → '0:01:15'. */
export function hms(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '';
  return `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
}
