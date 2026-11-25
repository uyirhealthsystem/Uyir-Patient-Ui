// Device location, made reliable.
//
// What went wrong before: getCurrentPositionAsync() has no timeout. With no
// GPS fix yet (indoors, a cold start, an emulator with no location set) or
// with location services switched off, it never settles, and the screen sat
// on "Finding your location…" forever. Now every step can fail with a clear
// reason (LocationError.code) that the UI turns into the right action:
// turn location on, open settings, retry, or type the address.
import * as Location from "expo-location";
import { Platform } from "react-native";

export interface Coords {
  latitude: number;
  longitude: number;
}

export type LocationErrorCode = "SERVICES_OFF" | "PERMISSION_DENIED" | "PERMISSION_BLOCKED" | "TIMEOUT" | "UNAVAILABLE";

export class LocationError extends Error {
  constructor(
    public code: LocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LocationError";
  }
}

const MESSAGES: Record<LocationErrorCode, string> = {
  SERVICES_OFF: "Location is turned off on this phone. Turn it on, or type the address.",
  PERMISSION_DENIED: "Uyir needs your location to find help near you. Allow it, or type the address.",
  PERMISSION_BLOCKED: "Location permission is blocked for Uyir. Open Settings to allow it, or type the address.",
  TIMEOUT: "We couldn't get a location fix. Move near a window or outdoors and retry, or type the address.",
  UNAVAILABLE: "Your location isn't available right now. Retry, or type the address.",
};
const fail = (code: LocationErrorCode) => new LocationError(code, MESSAGES[code]);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(fail("TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Location services (GPS / network) on. On Android, offers the system "turn on location" dialog first. */
async function ensureServices() {
  if (await Location.hasServicesEnabledAsync()) return;
  if (Platform.OS === "android") {
    try {
      await Location.enableNetworkProviderAsync(); // system dialog; rejects if the user says no
    } catch {
      // fall through to the check below
    }
    if (await Location.hasServicesEnabledAsync()) return;
  }
  throw fail("SERVICES_OFF");
}

async function ensurePermission() {
  let p = await Location.getForegroundPermissionsAsync();
  if (p.granted) return;
  if (!p.canAskAgain) throw fail("PERMISSION_BLOCKED");
  p = await Location.requestForegroundPermissionsAsync();
  if (p.granted) return;
  throw fail(p.canAskAgain ? "PERMISSION_DENIED" : "PERMISSION_BLOCKED");
}

let cached: { coords: Coords; at: number } | null = null;
const remember = (pos: Location.LocationObject): Coords => {
  const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  cached = { coords, at: Date.now() };
  return coords;
};

/**
 * Current device position. Fails with a LocationError, never hangs:
 * a fresh cached fix -> the OS's recent fix -> a GPS fix (12 s) -> a Wi-Fi/cell fix (8 s)
 * -> the last known fix of any age.
 *
 * GPS comes first: "Balanced" on Android uses only Wi-Fi/cell location and never
 * switches the GPS on, so it fails where there is no network location (outdoors
 * on mobile data, and every emulator, whose location controls only feed the GPS).
 */
export async function getCurrentPosition({ maxAgeMs = 60_000 } = {}): Promise<Coords> {
  if (cached && Date.now() - cached.at < maxAgeMs) return cached.coords;
  await ensureServices();
  await ensurePermission();

  const last = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60_000, requiredAccuracy: 1000 }).catch(() => null);
  if (last) return remember(last);

  try {
    return remember(await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 12_000));
  } catch {
    // No GPS fix in time (indoors, or the provider errored): try Wi-Fi/cell location.
  }
  try {
    return remember(await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 8_000));
  } catch (e) {
    // No new fix at all. In an emergency an older position beats none: use the
    // device's last known fix, whatever its age. The address is shown, so the
    // patient can check it and refresh. (Emulators and test providers only
    // report when a location is pushed, so this is the usual path there.)
    const stale = await Location.getLastKnownPositionAsync().catch(() => null);
    if (stale) return remember(stale);
    throw e instanceof LocationError ? e : fail("UNAVAILABLE");
  }
}

/** Best-effort human address for a coordinate (gives up after 6 s). */
export async function reverseGeocode(c: Coords): Promise<string | undefined> {
  try {
    const [r] = await withTimeout(Location.reverseGeocodeAsync(c), 6_000);
    if (!r) return undefined;
    return [r.name, r.street, r.district ?? r.subregion, r.city, r.postalCode].filter(Boolean).join(", ") || undefined;
  } catch {
    return undefined;
  }
}

/** Coordinates for a typed address (gives up after 8 s). */
export async function geocode(address: string): Promise<Coords | undefined> {
  try {
    const [r] = await withTimeout(Location.geocodeAsync(address), 8_000);
    return r ? { latitude: r.latitude, longitude: r.longitude } : undefined;
  } catch {
    return undefined;
  }
}

/** Straight-line distance in km. */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
