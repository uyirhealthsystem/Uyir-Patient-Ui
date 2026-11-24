import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Me } from "../profile/types";

/**
 * booting     - reading the saved session
 * signedOut   - show login / register
 * onboarding  - signed in, but userservice has no profile yet (404 PROFILE_REQUIRED)
 * ready       - signed in with a profile
 */
export type AuthStatus = "booting" | "signedOut" | "onboarding" | "ready";

export interface AuthState {
  status: AuthStatus;
  me: Me | null;
  /** Account email - from the access token's `email` claim (fallback: the email used to sign in). */
  accountEmail: string;
  accessToken: string | null;
  refreshToken: string | null;
}

const initialState: AuthState = { status: "booting", me: null, accountEmail: "", accessToken: null, refreshToken: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    tokensReceived(state, { payload }: PayloadAction<{ accessToken: string; refreshToken?: string | null }>) {
      state.accessToken = payload.accessToken;
      if (payload.refreshToken !== undefined) state.refreshToken = payload.refreshToken;
    },
    accountEmailSet(state, { payload }: PayloadAction<string>) {
      state.accountEmail = payload;
    },
    meLoaded(state, { payload }: PayloadAction<Me>) {
      state.me = payload;
      state.status = "ready";
    },
    profileRequired(state) {
      state.me = null;
      state.status = "onboarding";
    },
    /** Couldn't restore a session (e.g. offline): keep the refresh token for next launch. */
    signedOut(state) {
      state.status = "signedOut";
    },
    sessionCleared() {
      return { ...initialState, status: "signedOut" as const };
    },
  },
});

export const { tokensReceived, accountEmailSet, meLoaded, profileRequired, signedOut, sessionCleared } = authSlice.actions;
export const authReducer = authSlice.reducer;
