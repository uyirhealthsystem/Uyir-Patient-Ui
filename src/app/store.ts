import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { configureSession } from "../api/client";
import { authReducer, sessionCleared } from "../features/auth/authSlice";
import { readClaims } from "../features/auth/jwt";
import { emergencyReducer, emergencyReset } from "../features/emergency/emergencySlice";
import { locationReducer, placeCleared } from "../features/location/locationSlice";
import { baseApi, refreshAccessToken } from "../services/baseApi";

// Forget every cached server response and per-user choice when the session
// ends, so the next account never sees the previous one's data.
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: sessionCleared,
  effect: (_action, api) => {
    api.dispatch(baseApi.util.resetApiState());
    api.dispatch(emergencyReset());
    api.dispatch(placeCleared());
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    emergency: emergencyReducer,
    location: locationReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(baseApi.middleware),
});

configureSession({
  getAccessToken: () => store.getState().auth.accessToken || null,
  // Shared with RTK Query, so the two never rotate the refresh token at the same time.
  refresh: () => refreshAccessToken(store.dispatch),
  getUser: () => {
    const { me, accessToken } = store.getState().auth;
    const claims = accessToken ? readClaims(accessToken) : {};
    const userRecord = me as Record<string, unknown> | null;
    const id =
      (userRecord?.id as string | undefined) ??
      (userRecord?.userId as string | undefined) ??
      claims.sub ??
      null;
    const role =
      (userRecord?.role as string | undefined) ??
      claims.role ??
      (me || accessToken ? "PATIENT" : null);

    return id || role ? { id, role } : null;
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;