import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/src/lib/api';
import { fetchAppConfig } from '@/src/lib/api/appConfig';
import { cacheGetStale, cacheKeys, cacheSet } from '@/src/lib/cache';
import { appNotices, parseAppConfig, type AppConfig, type AppNotices } from './model';

interface State { config: AppConfig | null; fresh: boolean }

const KEY = cacheKeys.appConfig(API_BASE_URL);
let state: State = { config: null, fresh: false };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

/** The installed build's version (app.json "version"); an OTA update doesn't change it. */
export function nativeAppVersion(): string | null {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
}

/** The saved copy, used until the first fetch answers (and offline). */
export async function loadCachedAppConfig(): Promise<void> {
  if (state.config) return;
  try {
    const cached = parseAppConfig(await cacheGetStale(KEY));
    if (cached && !state.config) set({ config: cached, fresh: false });
  } catch { /* no saved copy */ }
}

/** Fetches the config; a failure keeps what we have (the app never blocks on an error). */
export function refreshAppConfig(): Promise<void> {
  inflight ??= (async () => {
    try {
      const config = parseAppConfig(await fetchAppConfig());
      if (!config) return;
      set({ config, fresh: true });
      // No expiry: offline launches keep the last answer.
      await cacheSet(KEY, config, 0).catch(() => undefined);
    } catch { /* offline, cold backend or an old backend without the route */ }
  })().finally(() => { inflight = null; });
  return inflight;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => state;

export function useAppConfig(): AppConfig | null {
  return useSyncExternalStore(subscribe, snapshot).config;
}

export function useAppNotices(): AppNotices {
  const { config, fresh } = useSyncExternalStore(subscribe, snapshot);
  return appNotices(config, nativeAppVersion(), Platform.OS, fresh);
}

/** A backend feature flag (admin dashboard → App config); `fallback` until the config loads or when unset. */
export function useFeatureFlag(name: string, fallback = false): boolean {
  return useAppConfig()?.features[name] ?? fallback;
}

/** Test helper. */
export function _resetAppConfigStore() {
  state = { config: null, fresh: false };
  inflight = null;
}
