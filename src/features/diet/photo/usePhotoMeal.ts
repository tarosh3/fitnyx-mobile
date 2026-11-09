import { useCallback, useEffect, useRef, useState } from 'react';

import { analyzeMealPhoto, type PhotoMealResult } from '@/src/lib/api/diet';
import { isDefinitelyOffline } from '@/src/lib/network';
import { photoErrorKind, type PhotoErrorKind } from './model';
import { photoForUpload } from './pick';

export type PhotoMealState =
  | { status: 'reading' }
  | { status: 'done'; result: PhotoMealResult; qty: (number | null)[] }
  | { status: 'error'; kind: PhotoErrorKind };

/**
 * Reads the photo at `uri` once on mount; `read(hint)` reads it again with a
 * note (another scan). Every food starts kept at 1×; `setQty(i, null)` removes it.
 */
export function usePhotoMeal(uri: string) {
  const [state, setState] = useState<PhotoMealState>({ status: 'reading' });
  const upload = useRef<string | null>(null);
  const run = useRef(0);

  const read = useCallback(async (hint: string) => {
    const id = ++run.current;
    setState({ status: 'reading' });
    try {
      if (await isDefinitelyOffline()) throw new Error('offline');
      upload.current ??= await photoForUpload(uri);
      const result = await analyzeMealPhoto(upload.current, hint);
      if (id === run.current) setState({ status: 'done', result, qty: result.items.map(() => 1) });
    } catch (error) {
      // A photo that couldn't be prepared on the phone is no network problem.
      const kind = upload.current ? photoErrorKind(error) : 'failed';
      if (id === run.current) setState({ status: 'error', kind: (error as Error)?.message === 'offline' ? 'offline' : kind });
    }
  }, [uri]);

  useEffect(() => {
    void read('');
    return () => { run.current++; };
  }, [read]);

  const setQty = useCallback((i: number, q: number | null) => {
    setState((s) => (s.status === 'done' ? { ...s, qty: s.qty.map((v, j) => (j === i ? q : v)) } : s));
  }, []);

  return { state, read, setQty };
}
