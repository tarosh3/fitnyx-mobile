import type { Part } from '@/src/features/workouts/model';
import type { Exercise } from '@/src/types/exercise';

/**
 * "What was that exercise?": narrow by body part → muscle → equipment.
 * `term` is what the backend's ?muscle= matches (an ILIKE on the catalog's
 * muscle names, e.g. "Back Shoulder"), so it must stay a substring of them.
 */
export interface MuscleChip { label: string; term: string }

export const MUSCLES_BY_PART: Record<Part, MuscleChip[]> = {
  chest: [{ label: 'Upper chest', term: 'Upper Chest' }, { label: 'Lower chest', term: 'Lower Chest' }],
  back: [{ label: 'Lats', term: 'Lats' }, { label: 'Upper back', term: 'Upper Back' }, { label: 'Lower back', term: 'Lower Back' }],
  legs: [
    { label: 'Quads', term: 'Quads' }, { label: 'Hamstrings', term: 'Hamstrings' }, { label: 'Glutes', term: 'Glutes' },
    { label: 'Calves', term: 'Calves' }, { label: 'Inner thigh', term: 'Inner Thigh' }, { label: 'Outer thigh', term: 'Outer Thigh' },
  ],
  shoulders: [{ label: 'Front delts', term: 'Front Shoulder' }, { label: 'Side delts', term: 'Side Shoulder' }, { label: 'Rear delts', term: 'Back Shoulder' }],
  arms: [{ label: 'Biceps', term: 'biceps' }, { label: 'Triceps', term: 'triceps' }, { label: 'Forearms', term: 'Forearm' }],
  core: [{ label: 'Upper abs', term: 'Upper Abs' }, { label: 'Lower abs', term: 'Lower Abs' }, { label: 'Obliques', term: 'Obliques' }],
  cardio: [],
};

/** The backend's equipment groups (?equipment=), in the order a row names them. */
export const EQUIPMENT_CHIPS = [
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'dumbbell', label: 'Dumbbell' },
  { key: 'barbell', label: 'Barbell' },
  { key: 'machine', label: 'Machine' },
  { key: 'cable', label: 'Cable' },
  { key: 'band', label: 'Band' },
  { key: 'kettlebell', label: 'Kettlebell' },
] as const;

export type EquipmentKey = (typeof EQUIPMENT_CHIPS)[number]['key'];

/** Mirrors the backend's equipmentGroups keywords; most specific first. */
const EQUIPMENT_KEYWORDS: [EquipmentKey, RegExp][] = [
  ['barbell', /barbell|ez bar|curl bar|t-bar|landmine/i],
  ['dumbbell', /dumbbell/i],
  ['kettlebell', /kettlebell/i],
  ['cable', /pulley/i],
  ['machine', /machine|leg press|lat pulldown|seated row|treadmill|rower|stepmill|bike|elliptical|stair climber/i],
  ['band', /band/i],
  ['bodyweight', /bodyweight/i],
];

/** The equipment group an exercise belongs to, e.g. "Barbell"; null if none matches. */
export function equipmentLabel(ex: Pick<Exercise, 'equipment'>): string | null {
  const names = (ex.equipment ?? []).map((e) => e.name).join(' | ');
  const hit = EQUIPMENT_KEYWORDS.find(([, re]) => re.test(names));
  return hit ? EQUIPMENT_CHIPS.find((c) => c.key === hit[0])!.label : null;
}

/** A finder row's second line: "Quads · Glutes · Barbell". */
export function finderMeta(ex: Pick<Exercise, 'primary_muscles' | 'equipment'>): string {
  const muscles = [...new Set((ex.primary_muscles ?? []).map((m) => m.name))].slice(0, 2);
  return [...muscles, equipmentLabel(ex)].filter(Boolean).join(' · ');
}
