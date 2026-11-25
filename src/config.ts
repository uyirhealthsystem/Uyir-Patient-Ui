// The api-gateway is the only backend this app talks to.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8080").replace(/\/+$/, "");

// authservice portal for the patient mobile app: PATIENT role, auto-approved,
// refresh token returned in the JSON body (not a cookie).
export const CLIENT_ID = "patient-app";

// Google sign-in: the WEB OAuth client ID from Google Cloud (the same one
// authservice has as GOOGLE_CLIENT_ID). Google issues the ID token for this
// audience, which authservice's /google/native always accepts.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

// userservice privacy notice version the patient accepts at onboarding.
export const PRIVACY_NOTICE_VERSION = "1";