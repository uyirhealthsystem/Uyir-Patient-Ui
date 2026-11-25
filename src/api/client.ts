import { store } from "../app/store";
import { API_BASE_URL } from "../config";
import { refreshAccessToken } from "../services/baseApi";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Every service answers errors differently:
//   Node services (auth, users, hbc): { error: { code, message, details? } }
//   hospitalservice (Spring):         { status, error, message, details: [] }
//   ambulance / payment (RFC 7807):   { title, detail, status, code }
function toApiError(status: number, data: any): ApiError {
  if (data && typeof data === "object") {
    if (data.error && typeof data.error === "object") {
      return new ApiError(status, data.error.code ?? "ERROR", data.error.message ?? "Request failed.", data.error.details);
    }
    if (typeof data.detail === "string" || typeof data.title === "string") {
      return new ApiError(status, data.code ?? data.title ?? "ERROR", data.detail ?? data.title);
    }
    if (typeof data.message === "string") {
      const details = Array.isArray(data.details) && data.details.length ? `\n${data.details.join("\n")}` : "";
      return new ApiError(status, typeof data.error === "string" ? data.error : "ERROR", data.message + details);
    }
  }
  if (status === 429) return new ApiError(status, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.");
  if (status >= 500) return new ApiError(status, "SERVER_ERROR", "The service is unavailable right now. Please try again.");
  return new ApiError(status, "ERROR", `Request failed (${status}).`);
}

// ── Session: the signed-in user's token from the Redux auth slice ───────────
// (Before this, nothing ever configured the session, so every Lab & Scan call went
// out without a token and the gateway answered 401.)
type SessionHooks = {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>; // returns a new access token, or null when the session is gone
};
let hooks: SessionHooks = {
  getAccessToken: () => store.getState().auth.accessToken,
  // Shared with RTK Query, so the two never rotate the refresh token at the same time.
  refresh: () => refreshAccessToken(store.dispatch),
};
export function configureSession(h: SessionHooks) {
  hooks = h;
}

// One refresh at a time, however many requests hit 401 together.
let refreshing: Promise<string | null> | null = null;
function refreshOnce() {
  if (!refreshing) refreshing = hooks.refresh().finally(() => (refreshing = null));
  return refreshing;
}

type Query = Record<string, string | number | boolean | undefined | null>;
export interface RequestOptions {
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
  /** Attach the access token (default true). */
  auth?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function send(method: string, path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", `Cannot reach the server at ${API_BASE_URL}. Check your connection.`);
  }
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  let res = await send(method, path, opts, useAuth ? hooks.getAccessToken() : null);

  if (res.status === 401 && useAuth) {
    const fresh = await refreshOnce();
    if (fresh) res = await send(method, path, opts, fresh);
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

export async function requestBinary(
  path: string,
  opts: Omit<RequestOptions, "body"> = {},
): Promise<{ bytes: ArrayBuffer; contentType: string | null }> {
  const useAuth = opts.auth !== false;
  let res = await send("GET", path, opts, useAuth ? hooks.getAccessToken() : null);

  if (res.status === 401 && useAuth) {
    const fresh = await refreshOnce();
    if (fresh) res = await send("GET", path, opts, fresh);
  }

  if (!res.ok) {
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    throw toApiError(res.status, data);
  }
  return { bytes: await res.arrayBuffer(), contentType: res.headers.get("Content-Type") };
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, { ...opts, body }),
  del: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("DELETE", path, { ...opts, body }),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
