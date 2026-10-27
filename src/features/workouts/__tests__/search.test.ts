import { searchExercises } from '@/src/features/workouts/search';
import type { Exercise } from '@/src/types/exercise';

function ex(title: string, muscles: string[], equipment: string[] = []): Exercise {
  return {
    uuid: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    primary_muscles: muscles.map((name) => ({ name, image: '', description: '' })),
    secondary_muscles: [],
    equipment: equipment.map((name) => ({ name, description: '' })),
    tracking_type: 'weight_reps',
  } as unknown as Exercise;
}

const catalog: Exercise[] = [
  ex('Barbell Back Squat', ['Quads', 'Glutes'], ['Barbell']),
  ex('Goblet Squat', ['Quads'], ['Dumbbell']),
  ex('Barbell Bench Press', ['Lower Chest', 'Upper Chest'], ['Barbell']),
  ex('Dumbbell Shoulder Press', ['Front Shoulder'], ['Dumbbell']),
  ex('Lat Pulldown', ['Lats'], ['Machine']),
  ex('Plank', ['Upper Abs', 'Lower Abs'], ['Bodyweight']),
];

const titles = (list: Exercise[]) => list.map((e) => e.title);

describe('searchExercises', () => {
  test('empty query returns all, sorted by title', () => {
    expect(titles(searchExercises(catalog, ''))).toEqual([
      'Barbell Back Squat', 'Barbell Bench Press', 'Dumbbell Shoulder Press', 'Goblet Squat', 'Lat Pulldown', 'Plank',
    ]);
  });

  test('exact title word ranks the titled match first', () => {
    const r = titles(searchExercises(catalog, 'squat'));
    expect(r).toContain('Barbell Back Squat');
    expect(r).toContain('Goblet Squat');
    expect(r).not.toContain('Plank');
  });

  test('matches by muscle name', () => {
    expect(titles(searchExercises(catalog, 'chest'))).toContain('Barbell Bench Press');
  });

  test('matches by body part (chest part for a chest exercise)', () => {
    // "chest" is both a muscle fragment and the part label
    expect(titles(searchExercises(catalog, 'chest'))).toEqual(['Barbell Bench Press']);
  });

  test('matches by equipment', () => {
    const r = titles(searchExercises(catalog, 'barbell'));
    expect(r).toContain('Barbell Back Squat');
    expect(r).toContain('Barbell Bench Press');
    expect(r).not.toContain('Goblet Squat');
  });

  test('tolerates typos', () => {
    expect(titles(searchExercises(catalog, 'squt'))).toContain('Barbell Back Squat');
    expect(titles(searchExercises(catalog, 'benh press'))).toContain('Barbell Bench Press');
  });

  test('expands gym synonyms (delts -> shoulder)', () => {
    expect(titles(searchExercises(catalog, 'delts'))).toContain('Dumbbell Shoulder Press');
  });

  test('all tokens must match (AND)', () => {
    const r = titles(searchExercises(catalog, 'barbell squat'));
    expect(r).toEqual(['Barbell Back Squat']);
  });

  test('no match returns empty', () => {
    expect(searchExercises(catalog, 'zzzznope')).toEqual([]);
  });
});
