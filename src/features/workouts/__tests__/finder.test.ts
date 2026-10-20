import { EQUIPMENT_CHIPS, equipmentLabel, finderMeta, MUSCLES_BY_PART } from '../finder';
import { PARTS } from '../model';

const eq = (...names: string[]) => names.map((name) => ({ name, description: '' }));
const mu = (...names: string[]) => names.map((name) => ({ name, image: '', description: '' }));

it('has muscle chips for every body part but cardio', () => {
  for (const p of PARTS) {
    if (p.key === 'cardio') expect(MUSCLES_BY_PART.cardio).toEqual([]);
    else expect(MUSCLES_BY_PART[p.key].length).toBeGreaterThan(1);
  }
});

it('names the equipment group, most specific first', () => {
  expect(equipmentLabel({ equipment: eq('Barbell', 'Squat Rack Or Power Rack') })).toBe('Barbell');
  expect(equipmentLabel({ equipment: eq('Bodyweight', 'Pull Up Bar') })).toBe('Bodyweight');
  expect(equipmentLabel({ equipment: eq('Single Grip Handles', 'Single Pulley Tower') })).toBe('Cable');
  expect(equipmentLabel({ equipment: eq('Leg Press') })).toBe('Machine');
  expect(equipmentLabel({ equipment: eq('Dumbbells', 'Flat Bench Without Rack') })).toBe('Dumbbell');
  expect(equipmentLabel({ equipment: eq('Towel') })).toBeNull();
  expect(EQUIPMENT_CHIPS.map((c) => c.key)).toEqual(['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'band', 'kettlebell']);
});

it('describes a row by its muscles and equipment', () => {
  expect(finderMeta({ primary_muscles: mu('Glutes', 'Quads', 'Quads'), equipment: eq('Barbell') })).toBe('Glutes · Quads · Barbell');
  expect(finderMeta({ primary_muscles: [], equipment: eq('Towel') })).toBe('');
});
