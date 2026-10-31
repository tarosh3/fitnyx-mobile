import { artworkSubject, profileAppearance, workoutFocus, artworkChoices } from '../artwork';
import type { ShareCardData } from '../cardData';

const base: ShareCardData = {
  kind: 'roam',
  activityType: 'run',
  kicker: 'STRIDE',
  title: 'Leg day on my bike',
  date: '',
  time: '',
  hero: { label: 'Distance', value: '5', unit: 'km' },
  stats: [],
  rows: [],
};

describe('share illustration selection', () => {
  it('uses only an explicitly saved gender, with an equipment fallback', () => {
    expect(profileAppearance('female')).toBe('woman');
    expect(profileAppearance('male')).toBe('man');
    for (const gender of [undefined, null, '', 'non_binary', 'prefer_not_to_say', 'unknown'])
      expect(profileAppearance(gender)).toBe('equipment');
  });
  it('weights actual exercise sets, never a session title', () => {
    expect(
      workoutFocus([
        { title: 'Bench press', sets: 4 },
        { title: 'Squat', sets: 2 },
      ]),
    ).toBe('push');
    expect(workoutFocus([{ title: 'Dumbbell row', sets: 4 }])).toBe('pull');
    expect(workoutFocus([{ title: 'Romanian deadlift', sets: 4 }])).toBe('legs');
    expect(workoutFocus([{ title: 'Ab Wheel Rollout', category: 'strength', sets: 3 }])).toBe('core');
    expect(workoutFocus([{ title: 'Seated stretch', sets: 3 }])).toBe('mobility');
    expect(workoutFocus([{ title: 'Custom bike exercise', trackingType: 'cardio', sets: 2 }])).toBe('cardio');
    expect(workoutFocus([{ title: 'Custom exercise', muscles: ['Pectorals'], sets: 3 }])).toBe('push');
  });
  it('keeps mixed, missing, and unlogged workouts generic', () => {
    expect(
      workoutFocus([
        { title: 'Bench press', sets: 3 },
        { title: 'Squat', sets: 3 },
      ]),
    ).toBe('full-body');
    expect(workoutFocus([{ title: 'Plank', sets: 0 }])).toBe('full-body');
    expect(workoutFocus([])).toBe('full-body');
  });
  it('selects on-foot poses from numeric pace, independently of a misleading name', () => {
    expect(artworkSubject({ ...base, avgPaceSecPerKm: 330 })).toBe('run');
    expect(artworkSubject({ ...base, avgPaceSecPerKm: 331 })).toBe('jog');
    expect(artworkSubject({ ...base, activityType: 'walk', avgPaceSecPerKm: 300 })).toBe('walk');
    expect(artworkSubject({ ...base, activityType: 'stride', avgPaceSecPerKm: 700 })).toBe('walk');
    expect(artworkSubject({ ...base, avgPaceSecPerKm: 0, avgSpeedMps: 3.2 })).toBe('run');
  });
  it('uses cycling speed without borrowing running pace thresholds', () => {
    expect(artworkSubject({ ...base, activityType: 'cycle', avgSpeedMps: 22 / 3.6 })).toBe('cycle-fast');
    expect(artworkSubject({ ...base, activityType: 'cycle', avgSpeedMps: 15 / 3.6, avgPaceSecPerKm: 100 })).toBe('cycle');
    expect(artworkChoices({ ...base, activityType: 'cycle' })).toEqual(['cycle', 'cycle-fast']);
  });
  it('handles absent and invalid telemetry without claiming a fast pace', () => {
    expect(artworkSubject(base)).toBe('jog');
    expect(artworkSubject({ ...base, avgSpeedMps: Infinity, avgPaceSecPerKm: NaN })).toBe('jog');
    expect(artworkSubject({ ...base, kind: 'workout', workoutFocus: 'legs' })).toBe('legs');
  });
});
