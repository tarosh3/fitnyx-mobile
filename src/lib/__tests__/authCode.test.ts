import { supabase } from '@/src/lib/supabase';
import { exchangeCodeOnce } from '../authCode';

it('exchanges a code once even when the form and the callback route both handle it', async () => {
  const exchange = jest.fn(async () => ({ data: { session: {} }, error: null }));
  (supabase.auth as unknown as { exchangeCodeForSession: jest.Mock }).exchangeCodeForSession = exchange;

  const [a, b] = await Promise.all([exchangeCodeOnce('code-1'), exchangeCodeOnce('code-1')]);

  expect(exchange).toHaveBeenCalledTimes(1);
  expect(a).toBe(b);
  expect(a.error).toBeNull();
});
