import { useCallback, useSyncExternalStore } from 'react';

/** The desktop layout (entry column beside the receipt) starts at Tailwind's `lg`. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/** Whether a media query matches, kept in sync as the window resizes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
