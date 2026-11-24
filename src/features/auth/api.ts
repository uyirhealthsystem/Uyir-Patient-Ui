// authservice /api/v1/auth. These calls run inside the auth thunks (they
// create or end the session), so they use the plain HTTP helper rather than
// RTK Query.
import { CLIENT_ID } from "../../config";
import { request } from "../../services/http";
import type { Me } from "../profile/types";
import type { LoginChallenge, Tokens } from "./types";

const post = <T>(url: string, body: unknown, token: string | null = null) =>
  request<T>({ url, method: "POST", body, auth: !!token }, token);

export const authApi = {
  register: (email: string, password: string) =>
    post<{ id: string; email: string; status: string }>("/api/v1/auth/email/register", { email, password, clientId: CLIENT_ID }),
  /** 202 -> emailed-code challenge; 200 -> tokens (when login OTP is disabled). */
  login: (email: string, password: string) =>
    post<LoginChallenge | Tokens>("/api/v1/auth/email/login", { email, password, clientId: CLIENT_ID }),
  verifyLogin: (challengeId: string, otp: string) =>
    post<Tokens>("/api/v1/auth/email/login/verify", { challengeId, otp, clientId: CLIENT_ID }),
  resendLogin: (challengeId: string) => post<LoginChallenge>("/api/v1/auth/email/login/resend", { challengeId, clientId: CLIENT_ID }),
  /** Native Google sign-in: exchange a Google ID token for Uyir tokens. Creates the patient account on first use. */
  google: (idToken: string) => post<Tokens>("/api/v1/auth/google/native", { idToken, clientId: CLIENT_ID }),
  refresh: (refreshToken: string) =>
    post<{ accessToken: string; refreshToken: string }>("/api/v1/auth/token/refresh", { refreshToken }),
  logout: (refreshToken: string) => post<void>("/api/v1/auth/logout", { refreshToken }),
  logoutAll: (accessToken: string) => post<{ revokedSessions: number }>("/api/v1/auth/logout-all", {}, accessToken),
  forgotPassword: (email: string) => post<unknown>("/api/v1/auth/password/forgot", { email, clientId: CLIENT_ID }),
  resetPassword: (email: string, otp: string, password: string) =>
    post<unknown>("/api/v1/auth/password/reset", { email, otp, password }),

  /** userservice: the signed-in patient. 404 PROFILE_REQUIRED until onboarding is done. */
  me: (accessToken: string) => request<Me>({ url: "/api/v1/users/me" }, accessToken),
};
