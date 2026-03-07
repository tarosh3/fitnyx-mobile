import { supabase } from '@/src/lib/supabase';

export async function getAuthToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error('Failed to get auth session');
  }
  if (!data.session?.access_token) {
    throw new Error('Not authenticated');
  }
  return data.session.access_token;
}
