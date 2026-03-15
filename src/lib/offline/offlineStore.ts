import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession, ExerciseLog } from '@/src/lib/api/workoutSessions';

const KEYS = {
  sessions: 'fitnyx-offline:sessions',
  logs: 'fitnyx-offline:logs',
  activeSessionId: 'fitnyx-offline:active-session-id',
  idMap: 'fitnyx-offline:id-map',
} as const;

export type OfflineSession = WorkoutSession & { _offline?: boolean };
export type OfflineExerciseLog = ExerciseLog & { _offline?: boolean };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function generateOfflineId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isOfflineId(id: string): boolean {
  return id.startsWith('offline-');
}

// --- Sessions ---

export async function saveOfflineSession(session: OfflineSession): Promise<void> {
  const sessions = await readJson<Record<string, OfflineSession>>(KEYS.sessions, {});
  sessions[session.id] = session;
  await writeJson(KEYS.sessions, sessions);
}

export async function getOfflineSession(sessionId: string): Promise<OfflineSession | null> {
  const sessions = await readJson<Record<string, OfflineSession>>(KEYS.sessions, {});
  return sessions[sessionId] ?? null;
}

export async function getAllOfflineSessions(): Promise<OfflineSession[]> {
  const sessions = await readJson<Record<string, OfflineSession>>(KEYS.sessions, {});
  return Object.values(sessions);
}

export async function removeOfflineSession(sessionId: string): Promise<void> {
  const sessions = await readJson<Record<string, OfflineSession>>(KEYS.sessions, {});
  delete sessions[sessionId];
  await writeJson(KEYS.sessions, sessions);
}

export async function getActiveOfflineSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.activeSessionId);
}

export async function setActiveOfflineSessionId(sessionId: string | null): Promise<void> {
  if (sessionId) {
    await AsyncStorage.setItem(KEYS.activeSessionId, sessionId);
  } else {
    await AsyncStorage.removeItem(KEYS.activeSessionId);
  }
}

// --- Exercise Logs ---

export async function saveOfflineLogs(sessionId: string, logs: OfflineExerciseLog[]): Promise<void> {
  const allLogs = await readJson<Record<string, OfflineExerciseLog[]>>(KEYS.logs, {});
  allLogs[sessionId] = logs;
  await writeJson(KEYS.logs, allLogs);
}

export async function getOfflineLogs(sessionId: string): Promise<OfflineExerciseLog[]> {
  const allLogs = await readJson<Record<string, OfflineExerciseLog[]>>(KEYS.logs, {});
  return allLogs[sessionId] ?? [];
}

export async function addOfflineLog(sessionId: string, log: OfflineExerciseLog): Promise<void> {
  const logs = await getOfflineLogs(sessionId);
  logs.push(log);
  await saveOfflineLogs(sessionId, logs);
}

export async function updateOfflineLog(
  sessionId: string,
  logId: string,
  updates: Partial<OfflineExerciseLog>
): Promise<OfflineExerciseLog | null> {
  const logs = await getOfflineLogs(sessionId);
  const idx = logs.findIndex((l) => l.id === logId);
  if (idx === -1) return null;
  logs[idx] = { ...logs[idx], ...updates };
  await saveOfflineLogs(sessionId, logs);
  return logs[idx];
}

export async function deleteOfflineLog(sessionId: string, logId: string): Promise<void> {
  const logs = await getOfflineLogs(sessionId);
  await saveOfflineLogs(
    sessionId,
    logs.filter((l) => l.id !== logId)
  );
}

export async function removeOfflineLogs(sessionId: string): Promise<void> {
  const allLogs = await readJson<Record<string, OfflineExerciseLog[]>>(KEYS.logs, {});
  delete allLogs[sessionId];
  await writeJson(KEYS.logs, allLogs);
}

// --- ID Mapping (offline temp ID → server real ID) ---

export async function setIdMapping(offlineId: string, realId: string): Promise<void> {
  const map = await readJson<Record<string, string>>(KEYS.idMap, {});
  map[offlineId] = realId;
  await writeJson(KEYS.idMap, map);
}

export async function getIdMapping(offlineId: string): Promise<string | null> {
  const map = await readJson<Record<string, string>>(KEYS.idMap, {});
  return map[offlineId] ?? null;
}

export async function clearIdMappings(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.idMap);
}

// --- Persistence for crash recovery ---

export async function persistSessionState(session: WorkoutSession, logs: ExerciseLog[]): Promise<void> {
  await saveOfflineSession({ ...session, _offline: isOfflineId(session.id) });
  await saveOfflineLogs(session.id, logs.map((l) => ({ ...l, _offline: isOfflineId(l.id) })));
  await setActiveOfflineSessionId(session.id);
}

export async function clearPersistedSession(sessionId: string): Promise<void> {
  await removeOfflineSession(sessionId);
  await removeOfflineLogs(sessionId);
  const activeId = await getActiveOfflineSessionId();
  if (activeId === sessionId) {
    await setActiveOfflineSessionId(null);
  }
}

// --- Cleanup stale data ---

const STALE_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function cleanupStaleSessions(): Promise<void> {
  const sessions = await readJson<Record<string, OfflineSession>>(KEYS.sessions, {});
  const now = Date.now();
  let changed = false;

  for (const [id, session] of Object.entries(sessions)) {
    const createdAt = new Date(session.created_at).getTime();
    const isTerminal = session.status === 'completed' || session.status === 'abandoned';

    // Remove terminal sessions older than 7 days
    if (isTerminal && now - createdAt > STALE_SESSION_AGE_MS) {
      delete sessions[id];
      await removeOfflineLogs(id);
      changed = true;
    }
  }

  if (changed) {
    await writeJson(KEYS.sessions, sessions);
  }
}
