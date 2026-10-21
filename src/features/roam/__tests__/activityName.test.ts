import { activityTitle, cleanActivityName, defaultActivityName } from '@/src/features/roam/activityName';

const at = (h: number) => new Date(2026, 9, 12, h, 30);

it('names a Roam by the time of day', () => {
  // Runs and walks (saved, or a Stride before saving) all read as Stride.
  expect(defaultActivityName('run', at(7))).toBe('Morning Stride');
  expect(defaultActivityName('walk', at(12))).toBe('Lunch Stride');
  expect(defaultActivityName('cycle', at(15))).toBe('Afternoon Ride');
  expect(defaultActivityName('stride', at(19))).toBe('Evening Stride');
  expect(defaultActivityName('run', at(23))).toBe('Night Stride');
  expect(defaultActivityName('run', at(3))).toBe('Night Stride');
});

it('prefers the user’s name over the default', () => {
  const base = { activity_type: 'run' as const, started_at: at(7).toISOString() };
  expect(activityTitle({ ...base, name: 'Tempo' })).toBe('Tempo');
  expect(activityTitle({ ...base, name: '  ' })).toBe('Morning Stride');
  expect(activityTitle({ ...base, name: null })).toBe('Morning Stride');
});

it('cleans names like the server', () => {
  expect(cleanActivityName('  Sunday \n  long   run ')).toBe('Sunday long run');
  expect(cleanActivityName('x'.repeat(80))).toHaveLength(60);
});
