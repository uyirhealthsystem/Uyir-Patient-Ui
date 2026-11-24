import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

/** Load data, reload when the screen regains focus, expose refresh state. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = [], { onFocus = true } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const first = useRef(true);

  const run = useCallback(async (mode: "initial" | "refresh" | "silent") => {
    if (mode === "refresh") setRefreshing(true);
    if (mode === "initial") setLoading(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void run("initial"), deps);

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (onFocus) void run("silent");
    }, [onFocus, run]),
  );

  return { data, setData, error, loading, refreshing, refresh: () => run("refresh"), reload: () => run("silent") };
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
