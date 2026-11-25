// Choices shown when booking an ambulance (used by ambulance booking and the emergency flow).
import type { IconName } from "../../ui/components";
import type { AmbulanceEmergencyType, AmbulanceType } from "./types";

export const EMERGENCY_OPTIONS: { value: AmbulanceEmergencyType; label: string; icon: IconName }[] = [
  { value: "CARDIAC", label: "Heart / chest pain", icon: "heart-outline" },
  { value: "ACCIDENT", label: "Accident / injury", icon: "car-outline" },
  { value: "BREATHING", label: "Breathing trouble", icon: "cloud-outline" },
  { value: "STROKE", label: "Stroke / fits", icon: "pulse-outline" },
  { value: "PREGNANCY", label: "Pregnancy", icon: "woman-outline" },
  { value: "OTHER", label: "Something else", icon: "help-circle-outline" },
];

export const TYPE_OPTIONS: { value: AmbulanceType; label: string; description: string; icon: IconName }[] = [
  { value: "BLS", label: "Basic (BLS)", description: "Oxygen and first aid. Most emergencies.", icon: "medkit-outline" },
  { value: "ALS", label: "Advanced (ALS)", description: "Paramedic, cardiac monitor, life-support drugs.", icon: "pulse-outline" },
  { value: "ICU", label: "Mobile ICU", description: "Ventilator and ICU care on the way.", icon: "bed-outline" },
  { value: "TRANSPORT", label: "Patient transport", description: "Non-emergency, e.g. discharge or check-ups.", icon: "car-outline" },
];
