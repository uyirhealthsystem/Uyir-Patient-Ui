import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { errorMessage } from "../services/http";

/** The parts of an RTK Query hook result a screen needs. */
interface QueryResult<T> {
  data?: T;
  /** Result for the current argument only (undefined while a new argument loads). */
  currentData?: T;
  error?: unknown;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => unknown;
}

/**
 * Adapts an RTK Query result for a screen: a message instead of an error
 * object, pull-to-refresh state, and a silent refetch when the screen
 * regains focus (RTK Query only knows about app focus).
 */
export function useScreenQuery<T>(q: QueryResult<T>, { onFocus = true } = {}) {
  const [refreshing, setRefreshing] = useState(false);
  const refetchRef = useRef(q.refetch);
  refetchRef.current = q.refetch;
  const first = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (!onFocus) return;
      try {
        refetchRef.current();
      } catch {
        // query not started (skipped): nothing to refetch
      }
    }, [onFocus]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchRef.current();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    data: q.currentData ?? null,
    error: q.error ? errorMessage(q.error) : null,
    // First load, or a new argument (another member, filter...) still loading.
    loading: q.isLoading || (q.isFetching && q.currentData === undefined && !q.error),
    fetching: q.isFetching,
    refreshing,
    refresh,
  };
}

/** Run an action with a busy flag and an error message. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorMessage(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

// Location helpers live in ./location; re-exported for existing callers.
export { geocode, getCurrentPosition, reverseGeocode, type Coords } from "./location";
