// Mirrors backend internal/service/app_config_service.go (AppConfigResponse) — change both together.
export interface AppConfig {
  min_version: string;
  latest_version: string;
  update_url_android: string | null;
  update_url_ios: string | null;
  maintenance_message: string | null;
  banner_message: string | null;
  banner_level: 'info' | 'warning';
  features: Record<string, boolean>;
}

export type AppBlock =
  | { kind: 'update'; url: string }
  | { kind: 'maintenance'; message: string };

export interface AppNotices {
  /** Full-screen, the app can't be used: a too-old build or maintenance. */
  block: AppBlock | null;
  /** A newer build exists (dismissible). `version` identifies it for the dismissal. */
  softUpdate: { url: string; version: string } | null;
  banner: { message: string; level: 'info' | 'warning' } | null;
}

const VERSION = /^\d{1,4}(\.\d{1,4}){0,2}$/;

export const STORE_URL = {
  android: 'https://play.google.com/store/apps/details?id=com.fitnyx.app',
  // No App Store listing yet; an iOS forced update needs update_url_ios.
  ios: null,
} as const;

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const httpsUrl = (v: unknown): string | null => (typeof v === 'string' && v.startsWith('https://') ? v : null);

/** Validates the server's body; anything malformed → null (= no config, the app runs normally). */
export function parseAppConfig(raw: unknown): AppConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.min_version !== 'string' || !VERSION.test(r.min_version)) return null;
  if (typeof r.latest_version !== 'string' || !VERSION.test(r.latest_version)) return null;
  const features: Record<string, boolean> = {};
  if (r.features && typeof r.features === 'object' && !Array.isArray(r.features)) {
    for (const [k, v] of Object.entries(r.features)) if (typeof v === 'boolean') features[k] = v;
  }
  return {
    min_version: r.min_version,
    latest_version: r.latest_version,
    update_url_android: httpsUrl(r.update_url_android),
    update_url_ios: httpsUrl(r.update_url_ios),
    maintenance_message: text(r.maintenance_message),
    banner_message: text(r.banner_message),
    banner_level: r.banner_level === 'warning' ? 'warning' : 'info',
    features,
  };
}

/** -1 / 0 / 1; missing parts count as 0 (1.2 == 1.2.0). Unparseable → 0, so it never blocks. */
export function compareVersions(a: string, b: string): number {
  if (!VERSION.test(a) || !VERSION.test(b)) return 0;
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * What to show for this build. `fresh` = fetched during this app run: maintenance
 * is only honoured then, so a saved copy can never lock an offline user out
 * after maintenance ended. A forced update applies from a saved copy too.
 */
export function appNotices(
  config: AppConfig | null,
  appVersion: string | null,
  platform: string,
  fresh: boolean,
): AppNotices {
  const none: AppNotices = { block: null, softUpdate: null, banner: null };
  if (!config) return none;
  const url = platform === 'ios'
    ? config.update_url_ios ?? STORE_URL.ios
    : platform === 'android' ? config.update_url_android ?? STORE_URL.android : null;
  const banner = config.banner_message ? { message: config.banner_message, level: config.banner_level } : null;

  if (fresh && config.maintenance_message) {
    return { block: { kind: 'maintenance', message: config.maintenance_message }, softUpdate: null, banner: null };
  }
  // Without a store URL there is nothing to send the user to — never block on that.
  if (appVersion && url && compareVersions(appVersion, config.min_version) < 0) {
    return { block: { kind: 'update', url }, softUpdate: null, banner: null };
  }
  const softUpdate = appVersion && url && compareVersions(appVersion, config.latest_version) < 0
    ? { url, version: config.latest_version }
    : null;
  return { block: null, softUpdate, banner };
}
