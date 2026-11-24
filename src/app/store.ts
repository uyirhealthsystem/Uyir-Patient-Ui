import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { authReducer, sessionCleared } from "../features/auth/authSlice";
import { baseApi } from "../services/baseApi";

// Forget every cached server response when the session ends, so the next
// account never sees the previous one's data.
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: sessionCleared,
  effect: (_action, api) => {
    api.dispatch(baseApi.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
