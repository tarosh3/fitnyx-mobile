import { ExerciseFilters, ExerciseResponse, Exercise } from '@/src/types/exercise';
import { fetchWithAuth } from '@/src/lib/api';

export async function fetchExercises({ page = 1, limit = 20, search = '', muscle = '', is_warmup = false }: ExerciseFilters): Promise<ExerciseResponse> {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    muscle,
  });

  if (is_warmup) {
    query.append('is_warmup', 'true');
  }

  return fetchWithAuth(`/view/exercises?${query.toString()}`);
}

export async function fetchExerciseByUUID(uuid: string): Promise<Exercise> {
  return fetchWithAuth(`/view/exercise/${uuid}`);
}
