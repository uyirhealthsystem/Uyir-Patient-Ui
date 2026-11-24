# Uyir Patient App (React Native / Expo)

Patient mobile app for the Uyir platform. It talks **only to the api-gateway** and calls **only the patient-facing endpoints**. Everything the service-provider app does (hospital inbox, accept/reject/reschedule, ambulance driver, nurse/physio/caretaker, PRO, Health Partner, admin) is left out. **ECG on Wheels, Teleconsultation and Lab & Scan are excluded.**

## Run

```bash
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_BASE_URL to the gateway
npm start                   # then press a (Android) / i (iOS), or scan with Expo Go
npm run typecheck
```

`EXPO_PUBLIC_API_BASE_URL`: Android emulator `http://10.0.2.2:8080`, iOS simulator `http://localhost:8080`, physical device `http://<PC-LAN-IP>:8080`.

## Auth

authservice portal `patient-app` (PATIENT, auto-approved). Email + password, then the emailed 6-digit login code when login OTP is on. The refresh token comes back in the JSON body and is kept in `expo-secure-store`. A 401 rotates it once (`/token/refresh`) and retries the request. After sign-in, `GET /api/v1/users/me` → `404 PROFILE_REQUIRED` sends the user to onboarding (`POST /api/v1/users/me` with privacy consent).

## APIs used (all in `src/api/endpoints.ts`)

| Service | Endpoints |
|---|---|
| auth `/api/v1/auth` | email/register, email/login, login/verify, login/resend, token/refresh, logout, logout-all, password/forgot, password/reset |
| users `/api/v1/users` | me (get/onboard/erase), me/profile (put), family-members CRUD, medical/{conditions,allergies,medications,vitals} CRUD, health-records, medical-history, abha + ABHA creation (consents, aadhaar/mobile OTP, address) |
| hospital `/api/v1/hospital` | search, nearby, by id, specialties, doctors/search, doctors/:id, emergency-conditions, emergency-sos, emergency-bookings (create, cancel, history), doctor-appointments (availability, create, history, cancel). In-person visits only |
| ambulance `/api/v1/ambulance/bookings` | estimate, emergency, scheduled, list, get, track, cancel, payment |
| hbc `/api/v1/hbc` | catalog/services, patient/bookings (create, list, get, pay, cancel) |
| payment `/api/payments` | get, refresh (status of your own payment after checkout) |

## Layout

```
App.tsx                     providers + navigator
src/config.ts               gateway URL, clientId
src/api/                    HTTP client (errors from every service normalised), types, endpoints
src/auth/AuthContext.tsx    session, refresh, onboarding gate
src/navigation/             auth stack · onboarding · tabs (Home, Bookings, Records, Profile) + screens
src/screens/                auth, onboarding, home, hospital, ambulance, homecare, bookings, records, profile
src/ui/                     theme + shared components
```

## Google sign-in

"Continue with Google" on the login and register screens uses the native SDK (`@react-native-google-signin/google-signin`). It gets a Google ID token and posts it to `POST /api/v1/auth/google/native` with `clientId: "patient-app"`. The first use creates the patient account. The patient-app portal rejects the browser redirect flow, so this is the only way.

Setup:
1. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` = the **Web** OAuth client ID. This is the same value as authservice's `GOOGLE_CLIENT_ID`, and authservice always accepts it as the token audience.
2. In the same Google Cloud project, create an **Android** OAuth client with package `in.uyir.patient` and the signing key's SHA-1:
   - debug: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (`android/app/debug.keystore`)
   - release / Play: add the upload key and Play app-signing SHA-1s too.
3. Run a development build, not Expo Go: `npx expo run:android`. In Expo Go the button explains that it needs the app build.

iOS later: create an iOS OAuth client and add `["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<ios-client-id>" }]` to `app.json` plugins. Don't add the plugin without options; that is the Firebase variant and breaks the build.

## Building on this Windows machine

- **Native build:** `plugins/withCmakeVersion.js` makes the app build its C++ with CMake 3.31.6. The default CMake 3.22.1 uses ninja 1.10, which fails on React Native codegen paths over 260 characters (`ninja: error: mkdir(...)`). Install CMake 3.31.6 in SDK Manager → SDK Tools.
- **Emulator:** the Intel UHD driver's Vulkan is too old for the emulator's default GPU mode, and it hangs "offline". Start it yourself before building:
  `emulator -avd Medium_Phone_API_37.0 -gpu swiftshader_indirect`.
  If `expo run:android` can't find a running emulator, it starts one without this flag, and that one hangs.
- **Prebuild "EBUSY":** close any terminal or editor whose working directory is inside `android/`, and run `android/gradlew --stop`.

## Not included yet

- Live ambulance map / STOMP socket. Tracking polls `/track` every 5 s.
- Downloading health-record attachments (the list and details are shown).
