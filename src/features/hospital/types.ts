// hospitalservice (patient side).
import type { Gender } from "../profile/types";

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
