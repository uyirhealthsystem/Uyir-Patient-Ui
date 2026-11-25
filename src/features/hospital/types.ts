// hospitalservice (patient side).
import type { Gender } from "../profile/types";

export interface Address {
  addressLine: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  pincode: string;
  /** GeoJSON point: coordinates = [longitude, latitude] (x = lng, y = lat). */
  location?: { x?: number; y?: number; coordinates?: number[] } | null;
}

/** A hospital address -> { latitude, longitude }, or null when it has no location. */
export function addressCoords(a: Address | null | undefined): { latitude: number; longitude: number } | null {
  const l = a?.location;
  const lng = l?.coordinates?.[0] ?? l?.x;
  const lat = l?.coordinates?.[1] ?? l?.y;
  return typeof lat === "number" && typeof lng === "number" ? { latitude: lat, longitude: lng } : null;
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
