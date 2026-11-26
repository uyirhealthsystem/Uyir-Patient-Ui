// Restores the saved session exactly once per app process.
// Both the app (on launch) and the background location task (which can start the
// JS runtime without any screen, e.g. after Android killed the app) need a session.
// Two bootstraps in parallel would each rotate the refresh token and the loser
// would sign the patient out, so they share one promise.
import { bootstrap } from "../features/auth/authThunks";
import { store } from "./store";

let booting: Promise<unknown> | null = null;

export function bootOnce(): Promise<unknown> {
  if (!booting) booting = store.dispatch(bootstrap());
  return booting;
}
