import { fetchWithAuth } from '@/src/lib/api';

export async function getDailyInsight() {
  return fetchWithAuth('/agent/daily-insight', {
    method: 'GET',
  });
}
