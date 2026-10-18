import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { offlinePauseSession, offlineResumeSession } from '@/src/lib/offline/offlineApi';
import { getActiveOfflineSessionId, getOfflineSession, resolveId } from '@/src/lib/offline/offlineStore';
import { loadWorkoutDetails, updateWorkoutDetails } from '@/src/lib/workoutActivityDetails';

type NativeAction = { kind?: string; id: string; sessionId: string; action: string; timestamp: string; content: string };
const bridge = Platform.OS === 'ios' ? NativeModules.FitNyxWorkoutControls : undefined;
export async function pendingWorkoutControls(): Promise<NativeAction[]> { return bridge ? (await bridge.getPendingActions()).filter((entry: NativeAction) => entry.kind !== 'roam') : []; }
export function subscribeNativeWorkoutControls(callback: () => void) {
  if (!bridge) return () => {};
  const listener = new NativeEventEmitter(bridge).addListener('onWorkoutControl', callback);
  return () => listener.remove();
}
let draining: Promise<void> | undefined;
/** Replay in tap order with original timestamps, before fetching server state.
 * Native storage is acknowledged only after the offline-aware action succeeds. */
export function drainNativeWorkoutControls(): Promise<void> {
  if (draining) return draining;
  draining = replay().finally(() => { draining = undefined; });
  return draining;
}
async function replay() {
  const handled = new Set<string>();
  // A second tap can arrive while the first request is awaiting the network.
  // Re-read after each batch so a coalesced native event cannot strand it.
  while (true) {
    const batch = (await pendingWorkoutControls()).filter((entry) => !handled.has(entry.id));
    if (!batch.length) return;
    for (const entry of batch) {
      handled.add(entry.id);
      const currentId = await getActiveOfflineSessionId();
      const target = await resolveId(entry.sessionId);
      const session = currentId && await getOfflineSession(await resolveId(currentId));
      if (!session || session.id !== target || !['paused', 'in_progress'].includes(session.status)) {
        await bridge.acknowledgeActions([entry.id]);
        continue;
      }
      if (!Number.isFinite(Date.parse(entry.timestamp))) throw new Error('Invalid native workout action timestamp');
      if (entry.action === 'pause') await offlinePauseSession(target, entry.timestamp);
      else if (entry.action === 'resume') await offlineResumeSession(target, entry.timestamp);
      else if (!['rest', 'extendRest', 'skipRest'].includes(entry.action)) {
        await bridge.acknowledgeActions([entry.id]);
        continue;
      }
      const data = JSON.parse(entry.content);
      await loadWorkoutDetails(target);
      await updateWorkoutDetails(target, { restEnd: typeof data.restEnd === 'number' ? data.restEnd : undefined });
      await bridge.acknowledgeActions([entry.id]);
    }
  }
}
