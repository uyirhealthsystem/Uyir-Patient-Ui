// Every backend call the patient app makes, grouped by service. Only
// patient-facing endpoints live here: no provider, hospital-staff, driver,
// nurse, PRO, HP or admin operations, and nothing from ECG on Wheels or
// teleconsultation.
import { CLIENT_ID, PRIVACY_NOTICE_VERSION } from "../config";
import { api } from "./client";
import type {
  AbhaLink,
  Allergy,
  AmbulanceBooking,
  AmbulanceEmergencyType,
  AmbulancePayment,
  AmbulanceTrack,
  AmbulanceType,
  Appointment,
  AppointmentRequest,
  CareBooking,
  CareBookingInput,
  CarePayResponse,
  CareService,
  CareType,
  Condition,
  Doctor,
  EmergencyBooking,
  EmergencyCondition,
  EmergencyHospitalSuggestion,
  FamilyMember,
  FareEstimate,
  HealthRecord,
  Hospital,
  HospitalType,
  LoginChallenge,
  LabScanAppointment,
  LabScanAppointmentInput,
  LabScanPayment,
  LabScanReport,
  PatientHomeCollectionTracking,
  PatientLab,
  PatientScanCenter,
  PatientTimeSlot,
  Me,
  MedicalHistory,
  Medication,
  PageResponse,
  Payment,
  Place,
  Profile,
  ProfileInput,
  SpecialtyCategory,
  TokenAvailability,
  Tokens,
  Vital,
  VitalType,
} from "./types";

type LabScanEnvelope<T> = { status: "success"; data: T };
const labScanData = async <T>(promise: Promise<LabScanEnvelope<T>>) => (await promise).data;

// ── authservice  /api/v1/auth ───────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string) =>
    api.post<{ id: string; email: string; status: string }>(
      "/api/v1/auth/email/register",
      { email, password, clientId: CLIENT_ID },
      { auth: false },
    ),
  /** 202 -> emailed-code challenge; 200 -> tokens (when login OTP is disabled). */
  login: (email: string, password: string) =>
    api.post<LoginChallenge | Tokens>("/api/v1/auth/email/login", { email, password, clientId: CLIENT_ID }, { auth: false }),
  verifyLogin: (challengeId: string, otp: string) =>
    api.post<Tokens>("/api/v1/auth/email/login/verify", { challengeId, otp, clientId: CLIENT_ID }, { auth: false }),
  resendLogin: (challengeId: string) =>
    api.post<LoginChallenge>("/api/v1/auth/email/login/resend", { challengeId, clientId: CLIENT_ID }, { auth: false }),
  /** Native Google sign-in: exchange a Google ID token for Uyir tokens. Creates the patient account on first use. */
  google: (idToken: string) => api.post<Tokens>("/api/v1/auth/google/native", { idToken, clientId: CLIENT_ID }, { auth: false }),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>("/api/v1/auth/token/refresh", { refreshToken }, { auth: false }),
  logout: (refreshToken: string) => api.post<void>("/api/v1/auth/logout", { refreshToken }, { auth: false }),
  logoutAll: () => api.post<{ revokedSessions: number }>("/api/v1/auth/logout-all", {}),
  forgotPassword: (email: string) =>
    api.post<unknown>("/api/v1/auth/password/forgot", { email, clientId: CLIENT_ID }, { auth: false }),
  resetPassword: (email: string, otp: string, password: string) =>
    api.post<unknown>("/api/v1/auth/password/reset", { email, otp, password }, { auth: false }),
};

// ── userservice  /api/v1/users ──────────────────────────────────────────────
type MemberQuery = { memberId?: string };
export type AbhaNext = "MOBILE_VERIFY" | "ABHA_ADDRESS" | "DONE";
const medical = <T>(path: string, listKey: string, oneKey: string) => ({
  list: async (q: MemberQuery = {}) => (await api.get<Record<string, T[]>>(`/api/v1/users/me/medical/${path}`, { query: q }))[listKey],
  create: async (body: Record<string, unknown>) =>
    (await api.post<Record<string, T>>(`/api/v1/users/me/medical/${path}`, body))[oneKey],
  update: async (id: string, body: Record<string, unknown>) =>
    (await api.patch<Record<string, T>>(`/api/v1/users/me/medical/${path}/${id}`, body))[oneKey],
  remove: (id: string) => api.del<void>(`/api/v1/users/me/medical/${path}/${id}`),
});

export const usersApi = {
  me: () => api.get<Me>("/api/v1/users/me"),
  onboard: (profile: ProfileInput & { email: string }, referralCode?: string) =>
    api.post<Me>("/api/v1/users/me", {
      ...profile,
      consent: { noticeVersion: PRIVACY_NOTICE_VERSION, adultDeclaration: true },
      ...(referralCode ? { referralCode } : {}),
    }),
  replaceProfile: async (profile: ProfileInput) => (await api.put<{ profile: Profile }>("/api/v1/users/me/profile", profile)).profile,
  eraseAccount: () => api.del<void>("/api/v1/users/me", { confirm: "DELETE_MY_DATA" }),

  family: {
    list: async () => (await api.get<{ familyMembers: FamilyMember[] }>("/api/v1/users/me/family-members")).familyMembers,
    create: async (body: Omit<FamilyMember, "id" | "age"> & { consent: { noticeVersion: string; basis: string } }) =>
      (await api.post<{ familyMember: FamilyMember }>("/api/v1/users/me/family-members", body)).familyMember,
    update: async (id: string, body: Partial<FamilyMember>) =>
      (await api.patch<{ familyMember: FamilyMember }>(`/api/v1/users/me/family-members/${id}`, body)).familyMember,
    remove: (id: string) => api.del<void>(`/api/v1/users/me/family-members/${id}`),
  },

  conditions: medical<Condition>("conditions", "conditions", "condition"),
  allergies: medical<Allergy>("allergies", "allergies", "allergy"),
  medications: medical<Medication>("medications", "medications", "medication"),
  vitals: {
    ...medical<Vital>("vitals", "vitals", "vital"),
    create: async (body: { type: VitalType; value: number; secondaryValue?: number; notes?: string; familyMemberId?: string | null }) =>
      (await api.post<{ vital: Vital }>("/api/v1/users/me/medical/vitals", body)).vital,
  },

  healthRecords: (q: MemberQuery & { before?: string; beforeId?: string } = {}) =>
    api.get<{ healthRecords: HealthRecord[]; next: { before: string; beforeId: string } | null }>("/api/v1/users/me/health-records", {
      query: q,
    }),
  healthRecord: async (id: string) => (await api.get<{ healthRecord: HealthRecord }>(`/api/v1/users/me/health-records/${id}`)).healthRecord,
  medicalHistory: (q: MemberQuery = {}) => api.get<MedicalHistory>("/api/v1/users/me/medical-history", { query: q }),

  abha: {
    links: async () => (await api.get<{ abhaLinks: AbhaLink[] }>("/api/v1/users/me/abha")).abhaLinks,
    grantSharingConsent: () =>
      api.post<unknown>("/api/v1/users/me/consents", { purpose: "ABDM_SHARING", noticeVersion: "1", adultDeclaration: true }),
    consentText: () => api.get<{ code: string; version: string; language: string; text: string }>("/api/v1/users/me/abha/create/consent-text"),
    sendAadhaarOtp: (aadhaar: string, version: string) =>
      api.post<{ message: string; expiresAt: string }>("/api/v1/users/me/abha/create/aadhaar/otp", {
        aadhaar,
        consent: { accepted: true, version },
      }),
    verifyAadhaarOtp: (otp: string, mobile: string) =>
      api.post<{ abhaLink: AbhaLink; isNew: boolean; next: AbhaNext }>("/api/v1/users/me/abha/create/aadhaar/verify", { otp, mobile }),
    sendMobileOtp: () => api.post<{ message: string }>("/api/v1/users/me/abha/create/mobile/otp", {}),
    verifyMobileOtp: (otp: string) => api.post<{ next: AbhaNext }>("/api/v1/users/me/abha/create/mobile/verify", { otp }),
    addressSuggestions: () =>
      api.get<{ suggestions: string[]; suffix: string }>("/api/v1/users/me/abha/create/address-suggestions"),
    chooseAddress: (abhaAddress: string) =>
      api.post<{ abhaLink: AbhaLink }>("/api/v1/users/me/abha/create/address", { abhaAddress }),
    cancelCreation: () => api.del<void>("/api/v1/users/me/abha/create"),
  },
};

// ── hospitalservice  /api/v1/hospital (patient side only) ───────────────────
export const hospitalApi = {
  search: (q: { city?: string; hospitalType?: HospitalType; page?: number; size?: number }) =>
    api.get<PageResponse<Hospital>>("/api/v1/hospital", {
      query: { active: true, page: 0, size: 20, sort: "hospitalName,asc", ...q },
    }),
  nearby: (latitude: number, longitude: number, radiusKm = 10) =>
    api.get<Hospital[]>("/api/v1/hospital/nearby", { query: { latitude, longitude, radiusKm } }),
  byId: (id: string) => api.get<Hospital>(`/api/v1/hospital/${id}`),
  specialties: () => api.get<SpecialtyCategory[]>("/api/v1/hospital/specialties"),

  doctor: (id: string) => api.get<Doctor>(`/api/v1/hospital/doctors/${id}`),
  searchDoctors: (filter: { specialty?: string; hospitalId?: string }, page = 0) =>
    api.post<PageResponse<Doctor>>("/api/v1/hospital/doctors/search", { ...filter, active: true }, {
      query: { page, size: 20, sort: "name,asc" },
    }),

  emergencyConditions: () => api.get<EmergencyCondition[]>("/api/v1/hospital/emergency-conditions"),
  emergencySos: (emergencyType: string, latitude: number, longitude: number, radiusKm = 10) =>
    api.get<EmergencyHospitalSuggestion[]>("/api/v1/hospital/emergency-sos", {
      query: { emergencyType, latitude, longitude, radiusKm },
    }),
  createEmergencyBooking: (body: { hospitalId: string; emergencyType: string; patientName: string; patientPhone: string }) =>
    api.post<EmergencyBooking>("/api/v1/hospital/emergency-bookings", body),
  cancelEmergencyBooking: (id: string, reason?: string) =>
    api.patch<EmergencyBooking>(`/api/v1/hospital/emergency-bookings/${id}/cancel`, { reason }),
  emergencyHistory: () => api.get<EmergencyBooking[]>("/api/v1/hospital/emergency-bookings/history"),

  availability: (hospitalId: string, doctorId: string, date: string) =>
    api.get<TokenAvailability>("/api/v1/hospital/doctor-appointments/availability", { query: { hospitalId, doctorId, date } }),
  bookAppointment: (body: AppointmentRequest) => api.post<Appointment>("/api/v1/hospital/doctor-appointments", body),
  appointmentHistory: () => api.get<Appointment[]>("/api/v1/hospital/doctor-appointments/history"),
  cancelAppointment: (id: string, reason?: string) =>
    api.patch<Appointment>(`/api/v1/hospital/doctor-appointments/${id}/cancel`, { reason }),
};

// ── ambulance  /api/v1/ambulance/bookings (patient side only) ───────────────
export const ambulanceApi = {
  estimate: (pickup: Place, drop: Place, ambulanceType: AmbulanceType) =>
    api.post<FareEstimate>("/api/v1/ambulance/bookings/estimate", { pickup, drop, ambulanceType }),
  emergency: (body: {
    pickup: Place;
    drop?: Place;
    emergencyType: AmbulanceEmergencyType;
    ambulanceType?: AmbulanceType;
    contactName: string;
    contactPhone: string;
  }) => api.post<AmbulanceBooking>("/api/v1/ambulance/bookings/emergency", body),
  scheduled: (body: { pickup: Place; drop: Place; ambulanceType: AmbulanceType; scheduledAt: string; contactName: string; contactPhone: string }) =>
    api.post<AmbulanceBooking>("/api/v1/ambulance/bookings/scheduled", body),
  list: () => api.get<AmbulanceBooking[]>("/api/v1/ambulance/bookings"),
  get: (id: string) => api.get<AmbulanceBooking>(`/api/v1/ambulance/bookings/${id}`),
  track: (id: string) => api.get<AmbulanceTrack>(`/api/v1/ambulance/bookings/${id}/track`),
  cancel: (id: string) => api.post<AmbulanceBooking>(`/api/v1/ambulance/bookings/${id}/cancel`),
  pay: (id: string) => api.post<AmbulancePayment>(`/api/v1/ambulance/bookings/${id}/payment`),
};

// ── homebasedcare  /api/v1/hbc (patient side only) ──────────────────────────
export const homeCareApi = {
  services: (careType?: CareType) => api.get<CareService[]>("/api/v1/hbc/catalog/services", { query: { careType } }),
  create: (body: CareBookingInput) => api.post<CareBooking>("/api/v1/hbc/patient/bookings", body),
  list: () => api.get<CareBooking[]>("/api/v1/hbc/patient/bookings"),
  get: (id: string) => api.get<CareBooking>(`/api/v1/hbc/patient/bookings/${id}`),
  pay: (id: string) => api.post<CarePayResponse>(`/api/v1/hbc/patient/bookings/${id}/pay`, {}),
  cancel: (id: string, reason?: string) => api.post<CareBooking>(`/api/v1/hbc/patient/bookings/${id}/cancel`, { reason }),
};

// ── labscan /api/v1/labscan/patient (PATIENT only) ─────────────────────────
export const labScanApi = {
  labs: () => labScanData(api.get<LabScanEnvelope<PatientLab[]>>("/api/v1/labscan/patient/labs")),
  scanCenters: () => labScanData(api.get<LabScanEnvelope<PatientScanCenter[]>>("/api/v1/labscan/patient/scan-centers")),
  timeSlots: (q: { labId?: string; scanCenterId?: string; date?: string }) =>
    labScanData(api.get<LabScanEnvelope<PatientTimeSlot[]>>("/api/v1/labscan/patient/time-slots", { query: q })),
  createAppointment: (body: LabScanAppointmentInput) =>
    labScanData(api.post<LabScanEnvelope<LabScanAppointment>>("/api/v1/labscan/patient/appointments", body)),
  appointments: async () =>
    labScanData(api.get<LabScanEnvelope<LabScanAppointment[]>>("/api/v1/labscan/patient/appointments")),
  appointment: (id: string) =>
    labScanData(api.get<LabScanEnvelope<LabScanAppointment>>(`/api/v1/labscan/patient/appointments/${id}`)),
  reports: (id: string) =>
    labScanData(api.get<LabScanEnvelope<LabScanReport[]>>(`/api/v1/labscan/patient/appointments/${id}/reports`)),
  homeCollections: async () =>
    (await labScanData(api.get<LabScanEnvelope<{ total: number; bookings: LabScanAppointment[] }>>("/api/v1/labscan/patient/home-collections"))).bookings,
  homeCollectionHistory: async () =>
    (await labScanData(api.get<LabScanEnvelope<{ total: number; bookings: LabScanAppointment[] }>>("/api/v1/labscan/patient/home-collections/history"))).bookings,
  homeCollection: (id: string) =>
    labScanData(api.get<LabScanEnvelope<LabScanAppointment>>(`/api/v1/labscan/patient/home-collections/${id}`)),
  homeCollectionTracking: (id: string) =>
    labScanData(api.get<LabScanEnvelope<PatientHomeCollectionTracking>>(`/api/v1/labscan/patient/home-collections/${id}/tracking`)),
  createPaymentLink: (appointmentId: string) =>
    labScanData(api.post<LabScanEnvelope<LabScanPayment>>(`/api/v1/labscan/patient/appointments/${appointmentId}/payment`, {})),
};

// ── payment-service  /api/payments (read own payments) ──────────────────────
export const paymentsApi = {
  get: (id: string) => api.get<Payment>(`/api/payments/${id}`),
  refresh: (id: string) => api.post<Payment>(`/api/payments/${id}/refresh`),
};
