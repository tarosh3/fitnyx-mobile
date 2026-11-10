import { type NavigationAction, usePreventRemove, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Where a form stands, for SaveBar. `blocked`: there are changes, but something must be fixed first. */
export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'offline' | 'blocked';

/**
 * Tracks a form against what was last loaded or saved, so Save is only live when
 * something changed and says "Saved" afterwards. `values` is every editable field
 * (compared by JSON). Call `markLoaded()` once the form is filled and `markSaved()`
 * after a successful save, both after the state updates they follow: the baseline
 * is taken on the next render, once those updates are on screen.
 *
 * Leaving with unsaved changes (back button, Android back, iOS swipe) is held until
 * the user confirms; render `<ConfirmModal {...leave} />`.
 */
export function useSaveState(values: unknown, { saving, online, blocked = false }: { saving: boolean; online: boolean; blocked?: boolean }) {
  const key = JSON.stringify(values);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const pending = useRef<null | 'loaded' | 'saved'>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pending.current) return;
    setBaseline(key);
    setJustSaved(pending.current === 'saved');
    pending.current = null;
  }, [key, tick]);

  const markLoaded = useCallback(() => { pending.current = 'loaded'; setTick((t) => t + 1); }, []);
  const markSaved = useCallback(() => { pending.current = 'saved'; setTick((t) => t + 1); }, []);

  const dirty = baseline !== null && key !== baseline;
  useEffect(() => { if (dirty) setJustSaved(false); }, [dirty]);

  const status: SaveStatus = saving ? 'saving'
    : dirty ? (!online ? 'offline' : blocked ? 'blocked' : 'dirty')
    : justSaved ? 'saved' : 'clean';

  const navigation = useNavigation();
  const [leaveAction, setLeaveAction] = useState<NavigationAction | null>(null);
  usePreventRemove(dirty && !saving, ({ data }) => setLeaveAction(data.action));
  const leave = {
    visible: leaveAction !== null,
    title: 'Discard changes?',
    message: "You have changes that aren't saved yet.",
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    variant: 'danger' as const,
    onConfirm: () => { const a = leaveAction; setLeaveAction(null); if (a) navigation.dispatch(a); },
    onCancel: () => setLeaveAction(null),
  };

  return { status, dirty, markLoaded, markSaved, leave };
}
