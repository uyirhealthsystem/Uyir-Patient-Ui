// userservice medical records.
import type { AbhaLink } from "../profile/types";

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

export interface MedicalHistory {
  memberId: string;
  abha: AbhaLink | null;
  conditions: Condition[];
  allergies: Allergy[];
  currentMedications: Medication[];
  latestVitals: Vital[];
  recentHealthRecords: HealthRecord[];
}
