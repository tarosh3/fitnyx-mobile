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
