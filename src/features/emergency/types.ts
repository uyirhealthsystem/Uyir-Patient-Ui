// Emergency SOS: hospitalservice emergency-conditions / emergency-sos / emergency-bookings.
import type { AmbulanceEmergencyType } from "../ambulance/types";
import type { Address, ContactDetails } from "../hospital/types";

/** One of the 16 conditions a patient picks in SOS. `code` (e.g. EMG001) goes in emergencyType. */
export interface EmergencyCondition {
  code: string;
  name: string;
  icon: string;
}

/** A hospital that can take this emergency now: it handles it and has a doctor on duty who does. */
export interface EmergencyHospitalSuggestion {
  hospitalId: string;
  hospitalName: string;
  address: Address;
  contactDetails: ContactDetails;
  availableDoctorCount: number;
  availableSpecialties: string[];
}

/** REQUESTED -> ACCEPTED -> COMPLETED, or REQUESTED -> REJECTED, or (REQUESTED | ACCEPTED) -> CANCELLED. */
export type EmergencyBookingStatus = "REQUESTED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
export const ACTIVE_EMERGENCY: EmergencyBookingStatus[] = ["REQUESTED", "ACCEPTED"];

export interface EmergencyBooking {
  id: string;
  patientName: string;
  patientPhone: string;
  hospitalId: string;
  /** Stored as the condition's official name (not the code). */
  emergencyType: string;
  status: EmergencyBookingStatus;
  requestedAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  completedAt?: string | null;
  /** The ambulance bringing the patient, once the patient has linked it (PATCH {id}/ambulance). */
  ambulanceBookingId?: string | null;
  /** How the patient is getting there (PATCH {id}/arrival-mode). Null until the patient says. */
  arrivalMode?: ArrivalMode | null;
  /** When the patient's phone last sent its location to the hospital (null if never). */
  patientLocationUpdatedAt?: string | null;
}

/**
 * UYIR_AMBULANCE: booked in the app; the hospital follows the ambulance.
 * OTHER_AMBULANCE (108, private) / OWN_WAY: the hospital follows the patient's phone.
 */
export type ArrivalMode = "UYIR_AMBULANCE" | "OTHER_AMBULANCE" | "OWN_WAY";

// The ambulance service has 6 emergency types; the hospital has 16 conditions.
// Each condition maps to the type that best tells the crew what to bring.
const BY_CODE: Record<string, AmbulanceEmergencyType> = {
  EMG001: "CARDIAC", // Chest pain / sweating / palpitation
  EMG002: "STROKE", // Stroke / paralysis / sudden weakness
  EMG003: "OTHER", // Fits / seizures / fainting
  EMG004: "OTHER", // Unconscious / unresponsive
  EMG005: "BREATHING", // Breathing problem
  EMG006: "PREGNANCY", // Pregnancy related
  EMG007: "OTHER", // Child emergency
  EMG008: "ACCIDENT", // Burns / electric shock
  EMG009: "ACCIDENT", // Severe bleeding / trauma
  EMG010: "ACCIDENT", // Fall / fracture
  EMG011: "OTHER", // Abdominal pain
  EMG012: "ACCIDENT", // Road traffic accident
  EMG013: "BREATHING", // Allergy / anaphylaxis (airway)
  EMG014: "OTHER", // Poison intake
  EMG015: "OTHER", // Snake / animal bite
  EMG016: "OTHER", // Other
};

/** Condition code or official name -> the ambulance service's emergency type. */
export function toAmbulanceEmergencyType(codeOrName: string, conditions: EmergencyCondition[] = []): AmbulanceEmergencyType {
  if (BY_CODE[codeOrName]) return BY_CODE[codeOrName];
  const byName = conditions.find((c) => c.name.toLowerCase() === codeOrName.toLowerCase());
  return (byName && BY_CODE[byName.code]) || "OTHER";
}
