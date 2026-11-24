import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { ApiError, configureSession } from "../api/client";
import { authApi, usersApi } from "../api/endpoints";
import type { LoginChallenge, Me, Tokens } from "../api/types";
import { getGoogleIdToken, GoogleCancelled, googleSignOut } from "./google";
import { readClaims } from "./jwt";

const REFRESH_KEY = "uyir.refreshToken";
// Fallback only: the email the user signed in with, for servers whose access
// token doesn't carry an `email` claim yet. The token's claim wins.
const EMAIL_KEY = "uyir.accountEmail";

// SecureStore is native-only; on web (dev preview) fall back to memory.
const memory: Record<string, string> = {};
const store = {
  get: (k: string) => (Platform.OS === "web" ? Promise.resolve(memory[k] ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === "web" ? Promise.resolve(void (memory[k] = v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === "web" ? Promise.resolve(void delete memory[k]) : SecureStore.deleteItemAsync(k)),
};

/**
 * booting     - reading the saved session
 * signedOut   - show login / register
 * onboarding  - signed in, but userservice has no profile yet (404 PROFILE_REQUIRED)
 * ready       - signed in with a profile
 */
export type AuthStatus = "booting" | "signedOut" | "onboarding" | "ready";

interface AuthValue {
  status: AuthStatus;
  me: Me | null;
  /** Account email - from the access token's `email` claim (fallback: the email used to sign in). */
  accountEmail: string;
  /** Returns a challenge when an emailed code is needed, otherwise signs in. */
  login: (email: string, password: string) => Promise<LoginChallenge | null>;
  verifyLogin: (challengeId: string, otp: string) => Promise<void>;
  /** Google account picker -> Uyir session. Resolves false if the user cancelled. */
  loginWithGoogle: () => Promise<boolean>;
  logout: (everywhere?: boolean) => Promise<void>;
  reloadMe: () => Promise<void>;
  setMe: (me: Me) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("booting");
  const [me, setMeState] = useState<Me | null>(null);
  const [accountEmail, setAccountEmailState] = useState("");
  const rememberEmail = useCallback(async (email: string | null | undefined) => {
    if (!email) return;
    setAccountEmailState(email);
    await store.set(EMAIL_KEY, email).catch(() => undefined);
  }, []);
  const access = useRef<string | null>(null);
  const refresh = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    access.current = null;
    refresh.current = null;
    await store.del(REFRESH_KEY);
    await store.del(EMAIL_KEY).catch(() => undefined);
    setAccountEmailState("");
    setMeState(null);
    setStatus("signedOut");
  }, []);

  // Let the HTTP client read the token and rotate it on 401.
  useEffect(() => {
    configureSession({
      getAccessToken: () => access.current,
      refresh: async () => {
        if (!refresh.current) return null;
        try {
          const t = await authApi.refresh(refresh.current);
          access.current = t.accessToken;
          refresh.current = t.refreshToken;
          const email = readClaims(t.accessToken).email;
          if (email) setAccountEmailState(email);
          await store.set(REFRESH_KEY, t.refreshToken);
          return t.accessToken;
        } catch (e) {
          if (e instanceof ApiError && e.status !== 0) await clearSession();
          return null;
        }
      },
    });
  }, [clearSession]);

  const loadProfile = useCallback(async () => {
    try {
      const m = await usersApi.me();
      setMeState(m);
      setStatus("ready");
    } catch (e) {
      if (e instanceof ApiError && e.code === "PROFILE_REQUIRED") {
        setMeState(null);
        setStatus("onboarding");
        return;
      }
      throw e;
    }
  }, []);

  const startSession = useCallback(
    async (t: Tokens) => {
      if (t.role && t.role !== "PATIENT") throw new ApiError(403, "FORBIDDEN", "This app is for patients only.");
      access.current = t.accessToken;
      refresh.current = t.refreshToken ?? null;
      await rememberEmail(readClaims(t.accessToken).email);
      if (t.refreshToken) await store.set(REFRESH_KEY, t.refreshToken);
      await loadProfile();
    },
    [loadProfile, rememberEmail],
  );

  // Restore the saved session on launch.
  useEffect(() => {
    (async () => {
      const savedEmail = await store.get(EMAIL_KEY).catch(() => null);
      if (savedEmail) setAccountEmailState(savedEmail);
      const saved = await store.get(REFRESH_KEY);
      if (!saved) return setStatus("signedOut");
      try {
        const t = await authApi.refresh(saved);
        await startSession({ accessToken: t.accessToken, refreshToken: t.refreshToken });
      } catch (e) {
        if (e instanceof ApiError && e.status === 0) {
          // Offline: keep the token for next launch, but we can't continue.
          refresh.current = saved;
        }
        setStatus("signedOut");
      }
    })();
  }, [startSession]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      me,
      accountEmail,
      login: async (email, password) => {
        const r = await authApi.login(email.trim(), password);
        await rememberEmail(email.trim().toLowerCase());
        if ("otpRequired" in r && r.otpRequired) return r;
        await startSession(r as Tokens);
        return null;
      },
      verifyLogin: async (challengeId, otp) => {
        await startSession(await authApi.verifyLogin(challengeId, otp));
      },
      loginWithGoogle: async () => {
        let idToken: string;
        try {
          const g = await getGoogleIdToken();
          idToken = g.idToken;
          await rememberEmail(g.email);
        } catch (e) {
          if (e instanceof GoogleCancelled) return false;
          throw e;
        }
        await startSession(await authApi.google(idToken));
        return true;
      },
      logout: async (everywhere = false) => {
        try {
          if (everywhere) await authApi.logoutAll();
          else if (refresh.current) await authApi.logout(refresh.current);
        } catch {
          // signing out locally is what matters
        }
        await googleSignOut();
        await clearSession();
      },
      reloadMe: loadProfile,
      setMe: (m) => {
        setMeState(m);
        setStatus("ready");
      },
    }),
    [status, me, accountEmail, rememberEmail, startSession, clearSession, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
