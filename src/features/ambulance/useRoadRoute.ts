// The road route from the ambulance to where it is heading, for the live map.
//
// Uses the same OSRM routing as the ambulance service's ETA and the driver's app
// (router.project-osrm.org), so the line matches the ETA the patient sees.
// Only re-fetched after the ambulance has really moved, or the destination changed
// (it is polled every 5 s, the route doesn't need to be). On any failure the map
// falls back to a straight line, so tracking never depends on this.
import { useEffect, useRef, useState } from "react";
import { distanceKm } from "../../lib/location";

export interface LatLng {
  latitude: number;
  longitude: number;
}

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const REFETCH_AFTER_KM = 0.075; // the ambulance moved ~75 m from where the route was drawn
const TIMEOUT_MS = 8000;

async function fetchRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${OSRM}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    const coords: unknown = body?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords
      .filter((c): c is [number, number] => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
      .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Road route ambulance -> target; null until fetched, or when routing is unavailable. */
export function useRoadRoute(origin: LatLng | null, target: LatLng | null): LatLng[] | null {
  const [route, setRoute] = useState<LatLng[] | null>(null);
  const drawnFrom = useRef<{ origin: LatLng; target: LatLng } | null>(null);
  const request = useRef(0);

  const oLat = origin?.latitude, oLng = origin?.longitude, tLat = target?.latitude, tLng = target?.longitude;
  useEffect(() => {
    if (oLat == null || oLng == null || tLat == null || tLng == null) {
      drawnFrom.current = null;
      setRoute(null);
      return;
    }
    const o = { latitude: oLat, longitude: oLng };
    const t = { latitude: tLat, longitude: tLng };
    const prev = drawnFrom.current;
    const targetChanged = !prev || distanceKm(prev.target, t) > 0.01;
    if (!targetChanged && distanceKm(prev!.origin, o) < REFETCH_AFTER_KM) return;
    if (targetChanged) setRoute(null); // don't show the old leg (e.g. to the pickup) while the new one loads

    drawnFrom.current = { origin: o, target: t };
    const id = ++request.current;
    fetchRoute(o, t).then((r) => {
      if (id !== request.current) return; // a newer request superseded this one
      if (r) setRoute(r);
      else drawnFrom.current = null; // try again on the next position update
    });
  }, [oLat, oLng, tLat, tLng]);

  return route;
}
