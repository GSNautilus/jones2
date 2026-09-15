/**
 * The time preview: "what would this action cost?". Anything that can name a
 * number of minutes (an action button under the cursor, a hovered travel
 * destination on the map) pushes it here; the clock draws it as a hatched arc
 * on the ring and the digital readout shows the time that would be left.
 *
 * It is an external store rather than plain state so that hovering a button
 * re-renders the clock only, not the whole play screen.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

class PreviewStore {
  private value: number | null = null;
  private subs = new Set<() => void>();

  get = (): number | null => this.value;

  set = (minutes: number | null): void => {
    const v = minutes == null || !(minutes > 0) ? null : minutes;
    if (v === this.value) return;
    this.value = v;
    for (const fn of this.subs) fn();
  };

  subscribe = (fn: () => void): (() => void) => {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  };
}

const defaultStore = new PreviewStore();
const PreviewContext = createContext<PreviewStore>(defaultStore);

/** Optional: scopes a preview store to a subtree. Without it, one module-level store is shared. */
export function TimePreviewProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new PreviewStore(), []);
  return <PreviewContext.Provider value={store}>{children}</PreviewContext.Provider>;
}

export interface TimePreviewApi {
  /** Minutes the hovered/candidate action would consume, or null. */
  minutes: number | null;
  /** Push a candidate cost, or null to clear. */
  setPreview: (minutes: number | null) => void;
}

/** Read and write the preview. Components that only set it should use `useSetTimePreview`. */
export function useTimePreview(): TimePreviewApi {
  const store = useContext(PreviewContext);
  const minutes = useSyncExternalStore(store.subscribe, store.get, store.get);
  return { minutes, setPreview: store.set };
}

/** Write-only handle: never re-renders the caller. */
export function useSetTimePreview(): (minutes: number | null) => void {
  const store = useContext(PreviewContext);
  return store.set;
}

/**
 * Handy for hover targets: returns `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur`
 * props that set and clear the preview, and clears on unmount.
 */
export function usePreviewHandlers(minutes: number | null | undefined) {
  const setPreview = useSetTimePreview();
  const mine = useRef(false);
  const enter = useCallback(() => {
    mine.current = true;
    setPreview(minutes ?? null);
  }, [setPreview, minutes]);
  const leave = useCallback(() => {
    if (!mine.current) return;
    mine.current = false;
    setPreview(null);
  }, [setPreview]);
  useEffect(
    () => () => {
      if (mine.current) setPreview(null);
    },
    [setPreview],
  );
  return { onMouseEnter: enter, onMouseLeave: leave, onFocus: enter, onBlur: leave };
}
