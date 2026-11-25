// ambulance service (patient side).
import type { Place } from "../../services/types";

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

/** A driver has accepted and the patient isn't aboard yet: the patient pays now, then gets the pickup OTP. */
export const PAY_BEFORE_PICKUP: AmbulanceBookingStatus[] = ["EN_ROUTE_TO_PICKUP", "ARRIVED"];

/** The patient still has to pay: before pickup (prepaid rides) or after the drop (rides from before prepayment). */
export function paymentDue(b: Pick<AmbulanceBooking, "status" | "paidAt">): boolean {
  return !b.paidAt && (PAY_BEFORE_PICKUP.includes(b.status) || b.status === "PAYMENT_PENDING");
}
