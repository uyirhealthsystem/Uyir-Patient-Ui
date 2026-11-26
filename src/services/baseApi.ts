// The one RTK Query API. Each feature adds its endpoints with
// `baseApi.injectEndpoints` in its own `features/<name>/api.ts`.
import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../app/store";
import { refreshSession } from "../features/auth/authThunks";
import { send, type ApiError, type HttpRequest } from "./http";

// One refresh at a time, however many requests hit 401 together.
let refreshing: Promise<string | null> | null = null;

/**
 * One token refresh at a time for the whole app (RTK Query and src/api/client.ts):
 * two refreshes in parallel would each rotate the refresh token, and the loser would log the user out.
 * Resolves with the new access token, or null when the session is gone.
 */
export function refreshAccessToken(dispatch: (action: unknown) => unknown): Promise<string | null> {
  if (!refreshing) {
    refreshing = (dispatch(refreshSession()) as unknown as Promise<{ payload?: unknown }>)
      .then((a) => (typeof a.payload === "string" ? a.payload : null))
      .finally(() => (refreshing = null));
  }
  return refreshing;
}

const baseQuery: BaseQueryFn<HttpRequest, unknown, ApiError> = async (req, api) => {
  const useAuth = req.auth !== false;
  const token = () => (useAuth ? (api.getState() as RootState).auth.accessToken : null);

  let r = await send(req, token());
  if (!r.ok && r.error.status === 401 && useAuth) {
    const fresh = await refreshAccessToken(api.dispatch);
    if (fresh) r = await send(req, fresh);
  }
  return r.ok ? { data: r.data } : { error: r.error };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Family",
    "Medical",
    "HealthRecords",
    "MedicalHistory",
    "Abha",
    "Appointments",
    "EmergencyBookings",
    "AmbulanceBookings",
    "CareBookings",
  ],
  // Data is refetched when a screen mounts again if it is older than this.
  refetchOnMountOrArgChange: 30,
  endpoints: () => ({}),
});
