import { useCallback } from 'react';
import { useNavigation, useRouter, type Href } from 'expo-router';

/**
 * Go back when the screen just below this one is `name`, else push `href`.
 * Pro and Refer friends link to each other: pushing every time stacked
 * Pro → Refer friends → Pro, and back walked through the copies.
 */
export function useReturnOrPush() {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback((name: string, href: Href) => {
    const state = navigation.getState();
    const below = state ? state.routes[state.index - 1] : undefined;
    if (below?.name === name) router.back();
    else router.push(href);
  }, [navigation, router]);
}
