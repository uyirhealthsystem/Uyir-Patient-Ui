// Response/request shapes of the patient-facing endpoints, taken from each
// service's source. Only what the patient app reads is typed.

// ── authservice ─────────────────────────────────────────────────────────────
export interface Tokens {
  accessToken: string;
  refreshToken?: string;
  role?: string;
}
export interface LoginChallenge {
  otpRequired: true;
  challengeId: string;
  email: string; // masked
  codeLength: number;
  expiresAt: string;
  resendAvailableAt: string;
}

// ── userservice ─────────────────────────────────────────────────────────────
export type Gender = "MALE" | "FEMALE" | "OTHER";
export const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export interface Profile {
  fullName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  bloodGroup: BloodGroup | null;
  address: string | null;
  district: string | null;
  pinCode: string | null;
  age: number | null;
}
export interface Me {
  user: { id: string; patientNumber: string; [k: string]: unknown };
  profile: Profile;
  privacy?: { noticeVersion: string; consentRequired: boolean };
}
export interface ProfileInput {
  fullName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  bloodGroup?: BloodGroup | null;
  address?: string | null;
  district?: string | null;
  pinCode?: string | null;
}

export const RELATIONSHIPS = [
  "SPOUSE",
  "FATHER",
  "MOTHER",
  "SON",
  "DAUGHTER",
  "BROTHER",
  "SISTER",
  "GRANDPARENT",
  "GRANDCHILD",
  "OTHER",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];
export interface FamilyMember {
  id: string;
  fullName: string;
  relationship: Relationship;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  bloodGroup: BloodGroup | null;
  district: string | null;
  pinCode: string | null;
  age?: number | null;
}

export interface Condition {
  id: string;
  familyMemberId: string | null;
  name: string;
  status: "ACTIVE" | "RESOLVED";
  diagnosedOn: string | null;
  notes: string | null;
}
export interface Allergy {
  id: string;
  familyMemberId: string | null;
  allergen: string;
  category: "FOOD" | "DRUG" | "ENVIRONMENT" | "OTHER";
  severity: "MILD" | "MODERATE" | "SEVERE" | null;
  reaction: string | null;
  notes: string | null;
}
export interface Medication {
  id: string;
  familyMemberId: string | null;
  name: string;
  dosage: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  prescribedBy: string | null;
  notes: string | null;
}
export const VITAL_UNITS = {
  BLOOD_PRESSURE: "mmHg",
  HEART_RATE: "bpm",
  BLOOD_SUGAR: "mg/dL",
  SPO2: "%",
  TEMPERATURE: "°C",
  WEIGHT: "kg",
  HEIGHT: "cm",
} as const;
export type VitalType = keyof typeof VITAL_UNITS;
export interface Vital {
  id: string;
  familyMemberId: string | null;
  type: VitalType;
  value: number;
  secondaryValue: number | null;
  unit: string;
  measuredAt: string;
  notes: string | null;
}
export interface HealthRecord {
  id: string;
  familyMemberId?: string | null;
  recordType?: string;
  source?: string;
  title?: string;
  providerName?: string | null;
  recordedAt: string;
  summary?: string | null;
  attachments?: { id: string; fileName?: string; contentType?: string }[];
  [k: string]: unknown;
}
export interface AbhaLink {
  subject?: string;
  abhaNumber: string | null;
  abhaAddress: string | null;
  verifiedAt?: string | null;
  [k: string]: unknown;
}
export interface MedicalHistory {
  memberId: string;
  abha: AbhaLink | null;
  conditions: Condition[];
  allergies: Allergy[];
  currentMedications: Medication[];
  latestVitals: Vital[];
  recentHealthRecords: HealthRecord[];
}

// ── hospitalservice ─────────────────────────────────────────────────────────
export interface Address {
  addressLine: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  pincode: string;
  location?: { x?: number; y?: number; coordinates?: number[] } | null;
}
export interface ContactDetails {
  phone: string;
  alternatePhone?: string;
  email?: string;
  emergencyHotline?: string;
  website?: string;
}
export type HospitalType = "CLINIC" | "NURSING_HOME" | "HOSPITAL" | "SUPER_SPECIALITY" | "MEDICAL_COLLEGE";
export const HOSPITAL_TYPES: HospitalType[] = ["CLINIC", "NURSING_HOME", "HOSPITAL", "SUPER_SPECIALITY", "MEDICAL_COLLEGE"];
export interface Hospital {
  id: string;
  hospitalName: string;
  hospitalType: HospitalType;
  ownershipType?: string;
  address: Address;
  contactDetails: ContactDetails;
  facilities?: { specialtyDepartments?: string[]; bedCapacity?: Record<string, number> };
  emergencyServices?: {
    handlesEmergencies: boolean;
    ambulanceAvailable: boolean;
    ambulance24x7Available?: boolean;
    specialtyEmergencyConditionsHandled?: string[];
  };
  active: boolean;
}
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
export interface Doctor {
  id: string;
  name: string;
  sex?: Gender;
  qualifications?: string[];
  specialties?: string[];
  yearsOfExperience?: number;
  consultationFee?: number;
  availability?: { type?: string; customTimings?: string };
  hospitalAssociations?: { hospitalId: string; department?: string; consultationFee?: number; active?: boolean }[];
  currentHospitalId?: string | null;
  checkedInAt?: string | null;
  active: boolean;
}
export interface Specialty {
  code: string;
  name: string;
}
export interface SpecialtyCategory {
  category: string;
  specialties: Specialty[];
}
export interface EmergencyCondition {
  code: string;
  name: string;
  icon: string;
}
export interface EmergencyHospitalSuggestion {
  hospitalId: string;
  hospitalName: string;
  address: Address;
  contactDetails: ContactDetails;
  availableDoctorCount: number;
  availableSpecialties: string[];
}
export type EmergencyBookingStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
export interface EmergencyBooking {
  id: string;
  patientName: string;
  patientPhone: string;
  hospitalId: string;
  emergencyType: string;
  status: EmergencyBookingStatus;
  requestedAt: string;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
}
export type PatientRelationship = "SPOUSE" | "PARENT" | "CHILD" | "SIBLING" | "GRANDPARENT" | "GRANDCHILD" | "OTHER";
export type AppointmentStatus = "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export interface AppointmentRequest {
  hospitalId: string;
  doctorId: string;
  appointmentDateTime: string;
  durationMinutes?: number;
  consultationType: "IN_PERSON"; // teleconsultation is not part of this app
  visitType: "NEW" | "FOLLOW_UP";
  reason?: string;
  symptoms?: string[];
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientAge: number;
  patientGender: Gender;
  bookedFor: "SELF" | "FAMILY_MEMBER";
  relationship?: PatientRelationship;
}
export interface Appointment {
  id: string;
  patientName: string;
  hospitalId: string;
  doctorId: string;
  appointmentDateTime: string;
  tokenNumber?: number | null;
  consultationType: string;
  visitType: string;
  reason?: string | null;
  status: AppointmentStatus;
  bookedFor: "SELF" | "FAMILY_MEMBER";
  cancellationReason?: string | null;
}
export interface TokenAvailability {
  date: string;
  tokenLimit: number | null;
  bookedTokens: number;
  remainingTokens: number | null;
  available: boolean;
}

// ── ambulance ───────────────────────────────────────────────────────────────
export type AmbulanceType = "TRANSPORT" | "BLS" | "ALS" | "ICU";
export const AMBULANCE_TYPES: AmbulanceType[] = ["BLS", "ALS", "ICU", "TRANSPORT"];
export type AmbulanceEmergencyType = "CARDIAC" | "ACCIDENT" | "BREATHING" | "STROKE" | "PREGNANCY" | "OTHER";
export const AMBULANCE_EMERGENCY_TYPES: AmbulanceEmergencyType[] = ["CARDIAC", "ACCIDENT", "BREATHING", "STROKE", "PREGNANCY", "OTHER"];
export type AmbulanceBookingStatus =
  | "SCHEDULED"
  | "SEARCHING"
  | "EN_ROUTE_TO_PICKUP"
  | "ARRIVED"
  | "PICKED_UP"
  | "PAYMENT_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_AMBULANCE_FOUND";
export interface Place {
  lat: number;
  lng: number;
  address?: string;
}
export interface AmbulanceBooking {
  id: string;
  type: "EMERGENCY" | "SCHEDULED";
  status: AmbulanceBookingStatus;
  emergencyType: AmbulanceEmergencyType | null;
  ambulanceType: AmbulanceType | null;
  pickup: Place;
  drop: Place | null;
  scheduledAt: string | null;
  fare: number | null;
  driverId: string | null;
  contactName: string;
  contactPhone: string;
  pickupOtp: string | null;
  paymentId: string | null;
  paidAt: string | null;
  createdAt: string;
}
export interface AmbulanceTrack {
  booking: AmbulanceBooking;
  driver: { name: string; phone: string; plateNumber: string; ambulanceType: AmbulanceType; status: string } | null;
  location: { lat: number; lng: number; heading?: number | null; at: string } | null;
  eta: { minutes: number; distanceKm: number } | null;
}
export interface FareEstimate {
  distanceKm: number;
  durationMin: number;
  fare: number;
  currency: string;
}
export interface AmbulancePayment {
  bookingId: string;
  paymentId: string;
  status: "PENDING" | "PAID" | "FAILED";
  amount: number;
  currency: string;
  checkoutUrl: string | null;
}

// ── homebasedcare (hbc) ─────────────────────────────────────────────────────
export type CareType = "NURSE" | "PHYSIO" | "CARETAKER";
export const CARE_TYPES: CareType[] = ["NURSE", "PHYSIO", "CARETAKER"];
export interface CareService {
  id: string;
  careType: CareType;
  name: string;
  description: string | null;
  price: number | string;
  durationMinutes: number;
}
export type CareBookingStatus = "PENDING" | "ACCEPTED" | "CONFIRMED" | "PAID" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export interface Prescription {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}
export interface CareBooking {
  id: string;
  status: CareBookingStatus;
  careType: CareType;
  service: { id: string; name: string; durationMinutes: number };
  amount: number | string;
  scheduledAt: string;
  city: string;
  pincode: string;
  createdAt: string;
  address?: string;
  notes?: string | null;
  patient?: { id: string; fullName: string; phone: string };
  provider?: { id: string; fullName: string; phone: string } | null;
  prescriptions?: (Prescription & { id: string })[];
  visitOtp?: string | null;
  payment?: { id: string; status: string; failureReason: string | null; refundRequired: boolean } | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}
export interface CareBookingInput {
  serviceId: string;
  scheduledAt: string;
  patientName: string;
  patientPhone: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  notes?: string;
  prescriptions?: Prescription[];
}
export interface CarePayResponse {
  booking: CareBooking;
  payment: {
    id: string;
    status: string;
    checkoutUrl: string | null;
    checkoutExpiresAt: string | null;
    amount: number | string;
    currency: string;
  };
}

// ── payment-service ─────────────────────────────────────────────────────────
export interface Payment {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | string;
  checkoutUrl: string | null;
  referenceType: string;
  referenceId: string;
  amount: number;
  currency: string;
  refundedAmount: number | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}
