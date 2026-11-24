// homebasedcare (hbc), patient side.

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
