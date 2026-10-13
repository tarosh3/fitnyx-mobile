import { howToSteps, progressStats } from '../text';

describe('howToSteps', () => {
  it('uses the lines when the text has them, without their numbers', () => {
    expect(howToSteps('1. Lie on the bench.\n2) Lower the bar.\n- Press up.')).toEqual(['Lie on the bench.', 'Lower the bar.', 'Press up.']);
  });

  it('splits one paragraph into sentences', () => {
    expect(howToSteps('Stand tall. Brace your core! Lower slowly.')).toEqual(['Stand tall.', 'Brace your core!', 'Lower slowly.']);
    expect(howToSteps('Rest on your forearms.Keep your torso straight.')).toEqual(['Rest on your forearms.', 'Keep your torso straight.']);
  });

  it('is empty when there is nothing', () => {
    expect(howToSteps('')).toEqual([]);
    expect(howToSteps(undefined)).toEqual([]);
  });
});

describe('progressStats', () => {
  const day = (sets: object[]) => ({ date: '2026-10-01', session_id: 's', sets, max_weight_kg: null, total_volume_kg: 0, est_1rm_kg: null });
  const summary = { best_weight_kg: 80, best_est_1rm_kg: 95, total_sessions: 2, last_performed: '' };

  it('shows the longest hold for timed exercises', () => {
    const h = { exercise_uuid: 'p', summary, days: [day([{ set_index: 1, reps: 0, weight_kg: null, duration_sec: 75 }])] } as never;
    expect(progressStats('duration', h)).toEqual([{ label: 'Longest hold', value: '1:15' }, { label: 'Workouts', value: '2' }]);
  });

  it('shows best weight for lifts', () => {
    const h = { exercise_uuid: 'b', summary, days: [day([{ set_index: 1, reps: 5, weight_kg: 80 }])] } as never;
    expect(progressStats('weight_reps', h)[0]).toEqual({ label: 'Best', value: '80 kg' });
  });

  it('shows the farthest run for cardio', () => {
    const h = { exercise_uuid: 't', summary, days: [day([{ set_index: 1, reps: 0, weight_kg: null, duration_sec: 1500, distance_m: 4200 }])] } as never;
    expect(progressStats('cardio', h).slice(0, 2)).toEqual([{ label: 'Longest', value: '25 min' }, { label: 'Farthest', value: '4.2 km' }]);
  });
});
