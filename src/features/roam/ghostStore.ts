import AsyncStorage from '@react-native-async-storage/async-storage';

import { activityTitle } from '@/src/features/roam/activityName';
import { buildGhost, type GhostTarget, type RaceState } from '@/src/features/roam/ghost';
import { getActivity, type ActivityDetail } from '@/src/lib/api/activities';
import { cacheGetStale, cacheKeys, cacheSet, cacheTTL } from '@/src/lib/cache';

/** A past Roam as a ghost: its saved copy on the phone, else from the server. */
export async function loadGhost(userId: string, activityId: string): Promise<GhostTarget> {
  const key = cacheKeys.roamActivity(userId, activityId);
  let detail = await cacheGetStale<ActivityDetail>(key).catch(() => null);
  if (!detail) {
    detail = await getActivity(activityId);
    await cacheSet(key, detail, cacheTTL.DAY).catch(() => undefined);
  }
  return buildGhost(detail, activityTitle(detail));
}

// The ghost being raced lives next to the recording (fitnyx-roam:*), keyed by
// its clientId, so the race survives the app being killed mid-Roam and works
// without a connection.
const KEY = 'fitnyx-roam:ghost';
const RESULTS_KEY = 'fitnyx-roam:race-results';
const MAX_RESULTS = 50;

export async function startGhost(clientId: string, target: GhostTarget): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ clientId, target }));
}

export async function getGhost(clientId: string | undefined): Promise<GhostTarget | null> {
  if (!clientId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as { clientId: string; target: GhostTarget }) : null;
    return saved?.clientId === clientId ? saved.target : null;
  } catch {
    return null;
  }
}

/** How a saved Roam did against its ghost, shown on its page later. */
export interface RaceResult {
  ghostTitle: string;
  ghostStartedAt: string;
  ghostDistanceM: number;
  state: RaceState;
}

export async function saveRaceResult(activityId: string, result: RaceResult): Promise<void> {
  try {
    const all = await readResults();
    all[activityId] = result;
    const ids = Object.keys(all);
    for (const id of ids.slice(0, Math.max(0, ids.length - MAX_RESULTS))) delete all[id];
    await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    // A lost result only hides a card.
  }
}

export async function getRaceResult(activityId: string): Promise<RaceResult | null> {
  try {
    return (await readResults())[activityId] ?? null;
  } catch {
    return null;
  }
}

async function readResults(): Promise<Record<string, RaceResult>> {
  const raw = await AsyncStorage.getItem(RESULTS_KEY);
  return raw ? (JSON.parse(raw) as Record<string, RaceResult>) : {};
}

// "Race this Roam" on a Roam's page picks the ghost, then returns to the Roam
// screen underneath, which takes it on focus.
let pending: GhostTarget | null = null;
export function setPendingRace(target: GhostTarget): void {
  pending = target;
}
export function takePendingRace(): GhostTarget | null {
  const t = pending;
  pending = null;
  return t;
}
