import { supabase } from '@/src/lib/supabase';
import { idbGet, idbSet } from '@/src/lib/cache/indexeddb';
import { getApiBaseUrl } from '@/src/lib/config/backend';

export const API_BASE_URL = getApiBaseUrl();

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('No active session');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const wrapped = new Error(body?.error || `API call failed: ${response.statusText}`) as Error & {
      status?: number;
      data?: any;
    };
    wrapped.status = response.status;
    wrapped.data = body;
    throw wrapped;
  }

  return body;
}

export async function saveMetric(data: { weight_kg?: number; height_cm?: number; source?: string }) {
  return fetchWithAuth('/metrics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMetricsHistory() {
  return fetchWithAuth('/metrics');
}

export async function fetchLatestMetric() {
  return fetchWithAuth('/metrics/latest');
}

export interface DietFoodItem {
  dish: string;
  descriptor?: string;
  composition?: {
    base?: string;
    protein?: string;
    veggies?: string;
    flavor?: string;
    fat?: string;
    extras?: string;
  };
  ingredients?: string[];
}

export interface DietPlan {
  id: string;
  user_id: string;
  plan_data: {
    summary: string;
    total_calories: number;
    macros: { protein: string; carbs: string; fats: string };
    meals: {
      name: string;
      time: string;
      items: Array<DietFoodItem | string>;
      alternatives?: Array<DietFoodItem | string>;
      calories: number;
      macros: { p: string; c: string; f: string };
    }[];
  };
  preferences: any;
  created_at: string;
}

export const DIET_PLAN_CACHE_KEY = 'user-diet-plan';

export async function getDietPlan(): Promise<DietPlan> {
  const cached = await idbGet<DietPlan>(DIET_PLAN_CACHE_KEY);
  if (cached) return cached;

  const plan = await fetchWithAuth('/diet');
  if (plan?.id) {
    await idbSet(DIET_PLAN_CACHE_KEY, plan, 24 * 60 * 60 * 1000);
  }
  return plan;
}

export async function generateDietPlan(preferences: any): Promise<DietPlan> {
  const generated = await fetchWithAuth('/diet/generate', {
    method: 'POST',
    body: JSON.stringify({ preferences }),
  });

  if (generated?.id) {
    await idbSet(DIET_PLAN_CACHE_KEY, generated, 24 * 60 * 60 * 1000);
  }

  return generated;
}
