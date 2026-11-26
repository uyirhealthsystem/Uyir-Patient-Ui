// Shares the patient's phone location with the hospital while they travel to it by
// another ambulance (108, private) or on their own. Keeps going with the screen locked
// or the app in the background.
//
// Android: runs as a foreground service with a "Sharing your location" notification.
// That needs only the normal "While using the app" permission, as long as it is
// started while the app is on screen.
// iOS: needs the "Always" location permission; with "While using" it still works
// while the app is open.
//
// This file must be imported at startup (index.ts) so the task is defined even when
// Android starts the app in the background just to deliver locations.
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { request } from "../../api/client";
import { bootOnce } from "../../app/boot";
import { isApiError } from "../../services/http";
import { secureStore } from "../auth/session";

export const PATIENT_TRACKING_TASK = "uyir-emergency-patient-location";
// The emergency being shared, kept across app restarts for the background task.
const ACTIVE_KEY = "uyir.trackingEmergencyId";

type Fix = Pick<Location.LocationObject, "coords" | "timestamp">;

async function sendFix(emergencyId: string, fix: Fix) {
  const { latitude, longitude, accuracy, heading, speed } = fix.coords;
  await request("PUT", `/api/v1/hospital/emergency-bookings/${encodeURIComponent(emergencyId)}/patient-location`, {
    body: {
      lat: latitude,
      lng: longitude,
      accuracy: accuracy != null && accuracy >= 0 ? accuracy : undefined,
      heading: heading != null && heading >= 0 && heading <= 360 ? heading : undefined,
      speed: speed != null && speed >= 0 ? speed : undefined,
      recordedAt: new Date(fix.timestamp).toISOString(),
    },
  });
}

/** The server says this emergency no longer takes locations (over, someone else's, gone). */
const isFinal = (e: unknown) => isApiError(e) && [403, 404, 409].includes(e.status);

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(PATIENT_TRACKING_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const emergencyId = await secureStore.get(ACTIVE_KEY).catch(() => null);
  if (!emergencyId) {
    await stopPatientTracking();
    return;
  }
  // The newest fix is enough: the hospital only shows where the patient is now.
  const latest = data.locations[data.locations.length - 1];
  try {
    await bootOnce();
    await sendFix(emergencyId, latest);
  } catch (e) {
    if (isFinal(e)) await stopPatientTracking();
    // Offline or server busy: the next fix tries again.
  }
});

export type TrackingStart = {
  /** False when location permission was refused: nothing is being shared. */
  started: boolean;
  /** iOS only: false when the patient allowed location only while using the app. */
  worksWhenLocked: boolean;
};

export async function startPatientTracking(emergencyId: string, hospitalName: string): Promise<TrackingStart> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return { started: false, worksWhenLocked: false };

  let worksWhenLocked = true;
  if (Platform.OS === "ios") {
    const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
    worksWhenLocked = !!bg?.granted;
  }

  await secureStore.set(ACTIVE_KEY, emergencyId);

  // Something on the map right away, without waiting for the first background fix.
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    .then((fix) => sendFix(emergencyId, fix))
    .catch(() => undefined);

  if (!(await Location.hasStartedLocationUpdatesAsync(PATIENT_TRACKING_TASK).catch(() => false))) {
    await Location.startLocationUpdatesAsync(PATIENT_TRACKING_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10_000,
      distanceInterval: 25,
      deferredUpdatesInterval: 10_000,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: `Sharing your location with ${hospitalName}`,
        notificationBody: "So the emergency team is ready when you arrive. Stops when your emergency ends.",
        notificationColor: "#D92D20",
        killServiceOnDestroy: false,
      },
    });
  }
  return { started: true, worksWhenLocked };
}

export async function stopPatientTracking() {
  await secureStore.del(ACTIVE_KEY).catch(() => undefined);
  if (await Location.hasStartedLocationUpdatesAsync(PATIENT_TRACKING_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(PATIENT_TRACKING_TASK).catch(() => undefined);
  }
}

/** The emergency whose location is being shared right now, if any. */
export async function trackedEmergencyId(): Promise<string | null> {
  const id = await secureStore.get(ACTIVE_KEY).catch(() => null);
  if (!id) return null;
  return (await Location.hasStartedLocationUpdatesAsync(PATIENT_TRACKING_TASK).catch(() => false)) ? id : null;
}
