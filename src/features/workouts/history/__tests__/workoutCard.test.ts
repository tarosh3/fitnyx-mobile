import { groupLogs } from '@/src/features/workouts/history/useSessionDetail';
import { sessionCardData } from '@/src/features/workouts/history/workoutCard';
import { totals } from '@/src/features/workouts/model';
import type { ExerciseLog, WorkoutSession } from '@/src/lib/api/workoutSessions';
import type { Exercise } from '@/src/types/exercise';

const session = { id: 's1', started_at: '2026-10-18T07:00:00Z', total_duration_sec: 3600, status: 'completed' } as WorkoutSession;
const log = (id: string, uuid: string, set: number, reps: number, weight: number, at: string, pr = false): ExerciseLog => ({
  id, session_id: 's1', user_id: 'u', exercise_uuid: uuid, set_index: set, reps, weight_kg: weight, is_warmup: false, created_at: at, is_pr: pr,
});
const ex = (uuid: string, title: string) => ({ uuid, title, tracking_type: 'weight_reps' }) as Exercise;

function detail(logs: ExerciseLog[]) {
  const exercises = { bench: ex('bench', 'Bench Press'), row: ex('row', 'Barbell Row') };
  const typeOf = () => 'weight_reps' as const;
  return { session, logs, groups: groupLogs(logs, exercises), totals: totals(logs, typeOf), typeOf };
}

describe('sessionCardData', () => {
  const logs = [
    log('1', 'bench', 1, 8, 60, '2026-10-18T07:05:00Z'),
    log('2', 'bench', 2, 6, 70, '2026-10-18T07:10:00Z'),
    log('3', 'row', 1, 10, 50, '2026-10-18T07:20:00Z', true),
  ];

  it('lists each exercise with its best set, records first', () => {
    const card = sessionCardData('Push day', detail(logs));
    expect(card.title).toBe('Push day');
    expect(card.rows.map((r) => r.name)).toEqual(['Barbell Row', 'Bench Press']);
    expect(card.rows[0].pr).toBe(true);
    expect(card.rows[1].detail).toContain('70');
  });

  it('keeps the set bars in the order they were done', () => {
    const shuffled = [logs[2], logs[0], logs[1]];
    expect(sessionCardData('Push day', detail(shuffled)).bars).toEqual(sessionCardData('Push day', detail(logs)).bars);
  });
});
