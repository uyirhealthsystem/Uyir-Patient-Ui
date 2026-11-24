// Session lifecycle: restore, sign in, refresh, sign out.
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "../../app/store";
import { apiError, isApiError, type ApiError } from "../../services/http";
import { authApi } from "./api";
import { accountEmailSet, meLoaded, profileRequired, sessionCleared, signedOut, tokensReceived } from "./authSlice";
import { getGoogleIdToken, GoogleCancelled, googleSignOut } from "./google";
import { readClaims } from "./jwt";
import { EMAIL_KEY, REFRESH_KEY, secureStore } from "./session";
import type { LoginChallenge, Tokens } from "./types";

const createAppThunk = createAsyncThunk.withTypes<{ state: RootState; dispatch: AppDispatch; rejectValue: ApiError }>();

/** Anything thrown -> the serializable ApiError the screens show. */
const asApiError = (e: unknown): ApiError =>
  isApiError(e) ? e : apiError(-1, "ERROR", e instanceof Error ? e.message : "Something went wrong.");

async function rememberEmail(dispatch: AppDispatch, email: string | null | undefined) {
  if (!email) return;
  dispatch(accountEmailSet(email));
  await secureStore.set(EMAIL_KEY, email).catch(() => undefined);
}

async function clearSession(dispatch: AppDispatch) {
  await secureStore.del(REFRESH_KEY).catch(() => undefined);
  await secureStore.del(EMAIL_KEY).catch(() => undefined);
  dispatch(sessionCleared());
}

/** Rotates the tokens. Resolves with the new access token, or null when the session is gone. */
export const refreshSession = createAppThunk<string | null>("auth/refresh", async (_, { getState, dispatch }) => {
  const rt = getState().auth.refreshToken;
  if (!rt) return null;
  try {
    const t = await authApi.refresh(rt);
    dispatch(tokensReceived(t));
    const email = readClaims(t.accessToken).email;
    if (email) dispatch(accountEmailSet(email));
    await secureStore.set(REFRESH_KEY, t.refreshToken);
    return t.accessToken;
  } catch (e) {
    // Offline (status 0): keep the session and try again later.
    if (!isApiError(e) || e.status !== 0) await clearSession(dispatch);
    return null;
  }
});

/** Loads the patient's profile and moves to "ready" or "onboarding". */
export const reloadMe = createAppThunk<void>("auth/reloadMe", async (_, { getState, dispatch, rejectWithValue }) => {
  const load = () => authApi.me(getState().auth.accessToken ?? "");
  try {
    let me;
    try {
      me = await load();
    } catch (e) {
      if (!isApiError(e) || e.status !== 401 || !(await dispatch(refreshSession()).unwrap())) throw e;
      me = await load();
    }
    dispatch(meLoaded(me));
  } catch (e) {
    if (isApiError(e) && e.code === "PROFILE_REQUIRED") {
      dispatch(profileRequired());
      return;
    }
    return rejectWithValue(asApiError(e));
  }
});

async function startSession(dispatch: AppDispatch, t: Tokens) {
  if (t.role && t.role !== "PATIENT") throw apiError(403, "FORBIDDEN", "This app is for patients only.");
  dispatch(tokensReceived({ accessToken: t.accessToken, refreshToken: t.refreshToken ?? null }));
  await rememberEmail(dispatch, readClaims(t.accessToken).email);
  if (t.refreshToken) await secureStore.set(REFRESH_KEY, t.refreshToken);
  await dispatch(reloadMe()).unwrap();
}

/** Restores the saved session on launch. */
export const bootstrap = createAppThunk<void>("auth/bootstrap", async (_, { dispatch }) => {
  const savedEmail = await secureStore.get(EMAIL_KEY).catch(() => null);
  if (savedEmail) dispatch(accountEmailSet(savedEmail));
  const saved = await secureStore.get(REFRESH_KEY).catch(() => null);
  if (!saved) {
    dispatch(signedOut());
    return;
  }
  try {
    const t = await authApi.refresh(saved);
    await startSession(dispatch, { accessToken: t.accessToken, refreshToken: t.refreshToken });
  } catch (e) {
    // Offline: keep the token for next launch, but we can't continue.
    if (isApiError(e) && e.status === 0) dispatch(tokensReceived({ accessToken: "", refreshToken: saved }));
    dispatch(signedOut());
  }
});

/** Returns a challenge when an emailed code is needed, otherwise signs in. */
export const login = createAppThunk<LoginChallenge | null, { email: string; password: string }>(
  "auth/login",
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      const r = await authApi.login(email.trim(), password);
      await rememberEmail(dispatch, email.trim().toLowerCase());
      if ("otpRequired" in r && r.otpRequired) return r;
      await startSession(dispatch, r as Tokens);
      return null;
    } catch (e) {
      return rejectWithValue(asApiError(e));
    }
  },
);

export const verifyLogin = createAppThunk<void, { challengeId: string; otp: string }>(
  "auth/verifyLogin",
  async ({ challengeId, otp }, { dispatch, rejectWithValue }) => {
    try {
      await startSession(dispatch, await authApi.verifyLogin(challengeId, otp));
    } catch (e) {
      return rejectWithValue(asApiError(e));
    }
  },
);

/** Google account picker -> Uyir session. Resolves false if the user cancelled. */
export const loginWithGoogle = createAppThunk<boolean>("auth/google", async (_, { dispatch, rejectWithValue }) => {
  try {
    let idToken: string;
    try {
      const g = await getGoogleIdToken();
      idToken = g.idToken;
      await rememberEmail(dispatch, g.email);
    } catch (e) {
      if (e instanceof GoogleCancelled) return false;
      throw e;
    }
    await startSession(dispatch, await authApi.google(idToken));
    return true;
  } catch (e) {
    return rejectWithValue(asApiError(e));
  }
});

export const logout = createAppThunk<void, boolean | undefined>("auth/logout", async (everywhere = false, { getState, dispatch }) => {
  const { accessToken, refreshToken } = getState().auth;
  try {
    if (everywhere && accessToken) await authApi.logoutAll(accessToken);
    else if (refreshToken) await authApi.logout(refreshToken);
  } catch {
    // signing out locally is what matters
  }
  await googleSignOut();
  await clearSession(dispatch);
});
