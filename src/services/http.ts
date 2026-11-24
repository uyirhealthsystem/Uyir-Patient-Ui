// Low-level HTTP: one fetch wrapper and one error shape for every service.
// RTK Query (services/baseApi.ts) and the auth thunks both sit on top of this.
import { API_BASE_URL } from "../config";

/** Plain, serializable error so it can live in the Redux store. */
export interface ApiError {
  status: number; // 0 = network failure
  code: string;
  message: string;
  details?: unknown;
}

export function isApiError(e: unknown): e is ApiError {
  return !!e && typeof e === "object" && typeof (e as ApiError).status === "number" && typeof (e as ApiError).code === "string";
}

export function apiError(status: number, code: string, message: string, details?: unknown): ApiError {
  return { status, code, message, details };
}

// Every service answers errors differently:
//   Node services (auth, users, hbc): { error: { code, message, details? } }
//   hospitalservice (Spring):         { status, error, message, details: [] }
//   ambulance / payment (RFC 7807):   { title, detail, status, code }
function toApiError(status: number, data: any): ApiError {
  if (data && typeof data === "object") {
    if (data.error && typeof data.error === "object") {
      return apiError(status, data.error.code ?? "ERROR", data.error.message ?? "Request failed.", data.error.details);
    }
    if (typeof data.detail === "string" || typeof data.title === "string") {
      return apiError(status, data.code ?? data.title ?? "ERROR", data.detail ?? data.title);
    }
    if (typeof data.message === "string") {
      const details = Array.isArray(data.details) && data.details.length ? `\n${data.details.join("\n")}` : "";
      return apiError(status, typeof data.error === "string" ? data.error : "ERROR", data.message + details);
    }
  }
  if (status === 429) return apiError(status, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.");
  if (status >= 500) return apiError(status, "SERVER_ERROR", "The service is unavailable right now. Please try again.");
  return apiError(status, "ERROR", `Request failed (${status}).`);
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface HttpRequest {
  url: string;
  method?: string;
  body?: unknown;
  params?: Query;
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

export type HttpResult = { ok: true; status: number; data: unknown } | { ok: false; error: ApiError };

/** Sends one request. Never throws: failures come back as `{ ok: false, error }`. */
export async function send(req: HttpRequest, token: string | null): Promise<HttpResult> {
  const headers: Record<string, string> = { Accept: "application/json", ...req.headers };
  if (req.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(buildUrl(req.url, req.params), {
      method: req.method ?? "GET",
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
  } catch {
    return { ok: false, error: apiError(0, "NETWORK", `Cannot reach the server at ${API_BASE_URL}. Check your connection.`) };
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
  return res.ok ? { ok: true, status: res.status, data } : { ok: false, error: toApiError(res.status, data) };
}

/** Promise form of `send` for thunks: resolves with the body or throws an ApiError. */
export async function request<T>(req: HttpRequest, token: string | null = null): Promise<T> {
  const r = await send(req, token);
  if (!r.ok) throw r.error;
  return r.data as T;
}

export function errorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string") return (e as { message: string }).message;
  return "Something went wrong.";
}
