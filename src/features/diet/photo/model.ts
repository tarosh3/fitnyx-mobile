import type { DietLogItem, PhotoMealItem } from '@/src/lib/api/diet';

// Pure helpers for logging a meal from a photo.

/** Longest side sent to the backend: enough to tell dal from sambar, ~150 KB as JPEG. */
export const MAX_PHOTO_SIDE = 1024;
const MAX_LOG_NAME = 120;

export type PhotoErrorKind = 'offline' | 'limit' | 'busy' | 'no_food' | 'failed';

/** What went wrong, from a fetchWithAuth error (status + code), for the message shown. */
export function photoErrorKind(error: unknown): PhotoErrorKind {
  const { status, code } = (error ?? {}) as { status?: number; code?: string };
  if (status === undefined) return 'offline';
  if (status === 429) return code === 'daily_limit' ? 'limit' : 'busy';
  if (status === 422) return 'no_food';
  return 'failed';
}

export const PHOTO_ERRORS: Record<PhotoErrorKind, { title: string; body: string }> = {
  offline: { title: 'No connection', body: 'Reading a photo needs the internet. Search works with your recent foods offline.' },
  limit: { title: 'That’s today’s photos', body: 'You’ve used today’s meal photos. Search or quick-add for now; photos come back tomorrow.' },
  busy: { title: 'One moment', body: 'Lots of photos right now. Try again in a minute.' },
  no_food: { title: 'No food spotted', body: 'Try a closer, brighter shot from above, with the whole plate in view.' },
  failed: { title: 'Couldn’t read that photo', body: 'Try again, or search for the food instead.' },
};

/** The resize that brings a photo's longest side down to MAX_PHOTO_SIDE, or null when it's already small enough. */
export function resizeFor(width: number, height: number): { width: number } | { height: number } | null {
  if (!(width > 0 && height > 0) || Math.max(width, height) <= MAX_PHOTO_SIDE) return null;
  return width >= height ? { width: MAX_PHOTO_SIDE } : { height: MAX_PHOTO_SIDE };
}

/**
 * Log items for the foods the user kept. Each photo item is the whole amount
 * shown, so it is one portion and `qty` scales it (null = removed).
 */
export function photoLogItems(items: PhotoMealItem[], qty: (number | null)[]): DietLogItem[] {
  return items.flatMap((it, i) => {
    const q = qty[i];
    if (q === null || q === undefined || q <= 0) return [];
    return [{
      food_id: it.food_id, name: it.name, portion_label: it.portion_label, qty: q,
      kcal: it.kcal, protein_g: it.protein_g, carbs_g: it.carbs_g, fat_g: it.fat_g, is_veg: it.is_veg,
    }];
  });
}

/** The meal's name: the model's when every food was kept, else the kept foods'. */
export function photoMealName(name: string, items: PhotoMealItem[], kept: DietLogItem[]): string {
  const full = name.trim() && kept.length === items.length ? name.trim() : kept.map((k) => k.name).join(', ');
  return full.slice(0, MAX_LOG_NAME) || 'Meal';
}
