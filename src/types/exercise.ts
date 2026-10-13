export interface Muscle {
  name: string;
  image: string;
  description: string;
}

export interface EquipmentItem {
  name: string;
  description: string;
}

export interface RelatedExercise {
  name: string;
  uuid: string;
  image: string;
  url?: string;
}

/** How a set of this exercise is measured (backend `exercises.tracking_type`). */
export type TrackingType = 'weight_reps' | 'reps' | 'duration' | 'cardio';

export interface Exercise {
  id: number;
  uuid: string;
  title: string;
  video_url: string;
  pro_tip: string;
  how_to: string;
  primary_muscles: Muscle[];
  secondary_muscles: Muscle[];
  equipment: EquipmentItem[];
  variations: RelatedExercise[];
  alternatives: RelatedExercise[];
  page_url: string;
  created_at: string;
  updated_at: string;
  category?: string;
  media_url?: string;
  /** Missing on data cached before the 2026-10 revamp — treat as 'weight_reps'. */
  tracking_type?: TrackingType;
  is_warmup?: boolean;
}

export interface ExerciseResponse {
  data: Exercise[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ExerciseFilters {
  search?: string;
  muscle?: string;
  is_warmup?: boolean;
  page: number;
  limit: number;
}
