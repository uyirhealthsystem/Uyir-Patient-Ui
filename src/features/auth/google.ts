import { TurboModuleRegistry } from "react-native";
import { GOOGLE_WEB_CLIENT_ID } from "../../config";

// Native Google Sign-In. The library needs its native module, which Expo Go
// doesn't contain, and it throws as soon as it is imported without it - so it
// is only required once we know the module is present (a development or
// release build).
type GoogleModule = typeof import("@react-native-google-signin/google-signin");

let lib: GoogleModule | null | undefined;
function load(): GoogleModule | null {
  if (lib !== undefined) return lib;
  lib = TurboModuleRegistry.get("RNGoogleSignin")
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("@react-native-google-signin/google-signin") as GoogleModule)
    : null;
  if (lib) lib.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: ["email", "profile"] });
  return lib;
}

/** Why Google sign-in can't run here, or null when it can. */
export function googleUnavailableReason(): string | null {
  if (!GOOGLE_WEB_CLIENT_ID) return "Google sign-in isn't configured (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set).";
  if (!load()) return "Google sign-in needs the Uyir app build - it can't run inside Expo Go. Use email and password here.";
  return null;
}

export class GoogleCancelled extends Error {}

/** Shows the Google account picker and returns a Google ID token (+ the account's email). */
export async function getGoogleIdToken(): Promise<{ idToken: string; email: string | null }> {
  const reason = googleUnavailableReason();
  if (reason) throw new Error(reason);
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = load()!;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always offer the account picker, not a silent re-use of the last account.
    await GoogleSignin.signOut().catch(() => undefined);
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) throw new GoogleCancelled();
    const idToken = res.data.idToken;
    if (!idToken) throw new Error("Google did not return an ID token. Check the web client ID.");
    return { idToken, email: res.data.user.email ?? null };
  } catch (e) {
    if (e instanceof GoogleCancelled) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) throw new GoogleCancelled();
      if (e.code === statusCodes.IN_PROGRESS) throw new Error("Google sign-in is already in progress.");
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error("Google Play services is missing or out of date on this device.");
      // DEVELOPER_ERROR (code 10): the Android OAuth client (package + SHA-1) isn't set up in Google Cloud.
      if (String(e.code) === "10" || /DEVELOPER_ERROR/.test(e.message)) {
        throw new Error("Google sign-in is not set up for this app build yet (Android OAuth client / SHA-1 missing in Google Cloud).");
      }
    }
    throw e;
  }
}

/** Forget the Google session on this device (so the picker shows next time). */
export async function googleSignOut() {
  const g = load();
  if (g) await g.GoogleSignin.signOut().catch(() => undefined);
}
