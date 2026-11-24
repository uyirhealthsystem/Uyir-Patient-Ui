import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
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

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Current device position (asks for permission). */
export async function getCurrentPosition(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission is needed. Enable it in Settings, or enter the address manually.");
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

/** Best-effort human address for a coordinate. */
export async function reverseGeocode(c: Coords): Promise<string | undefined> {
  try {
    const [r] = await Location.reverseGeocodeAsync(c);
    if (!r) return undefined;
    return [r.name, r.street, r.district ?? r.subregion, r.city, r.postalCode].filter(Boolean).join(", ");
  } catch {
    return undefined;
  }
}

/** Coordinates for a typed address (used for drop locations). */
export async function geocode(address: string): Promise<Coords | undefined> {
  try {
    const [r] = await Location.geocodeAsync(address);
    return r ? { latitude: r.latitude, longitude: r.longitude } : undefined;
  } catch {
    return undefined;
  }
}
