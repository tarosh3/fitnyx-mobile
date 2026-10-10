import 'react-native-url-polyfill/auto';

import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { secureStorage } from '@/src/lib/secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isServer = typeof window === 'undefined';

if (!supabaseUrl || !supabaseAnonKey) {
  // Never ship a silently-broken binary: a production build on a device must
  // have the real env vars inlined. The placeholder fallback below stays for
  // dev and for CI's static web export, which renders server-side with no env.
  if (!__DEV__ && !isServer) {
    throw new Error(
      'Supabase configuration missing: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set for production builds.'
    );
  }
  console.warn('Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

// Fall back to a syntactically valid placeholder so importing this module
// doesn't hard-crash createClient ("supabaseUrl is required") when env is
// absent — e.g. the web static-render build in CI, which runs with no env.
// Real builds inline the real EXPO_PUBLIC_* values, so this only applies when
// the vars are genuinely missing.
const resolvedUrl = supabaseUrl || 'https://placeholder.supabase.co';
const resolvedAnonKey = supabaseAnonKey || 'placeholder-anon-key';

const ssrSafeStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => undefined,
  removeItem: async (_key: string) => undefined,
};

export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  auth: {
    storage: isServer ? ssrSafeStorage : secureStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

if (!isServer) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
