import { Platform } from 'react-native';

const DEFAULT_BACKEND_URL = 'http://localhost:8080';

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function mapAndroidLocalhost(url: string): string {
  if (Platform.OS !== 'android') return url;

  return url
    .replace('://localhost', '://10.0.2.2')
    .replace('://127.0.0.1', '://10.0.2.2');
}

export function getBackendBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
  return mapAndroidLocalhost(normalizeUrl(raw));
}

export function getApiBaseUrl(): string {
  const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitApiUrl && explicitApiUrl.trim().length > 0) {
    return mapAndroidLocalhost(normalizeUrl(explicitApiUrl));
  }

  return `${getBackendBaseUrl()}/api/v1`;
}

