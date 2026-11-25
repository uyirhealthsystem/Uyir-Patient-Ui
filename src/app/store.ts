import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { authReducer, sessionCleared } from "../features/auth/authSlice";
import { emergencyReducer, emergencyReset } from "../features/emergency/emergencySlice";
import { locationReducer, placeCleared } from "../features/location/locationSlice";
import { baseApi } from "../services/baseApi";

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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
