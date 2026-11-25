// hospitalservice emergency SOS (patient side).
import { baseApi } from "../../services/baseApi";
import type { EmergencyBooking, EmergencyCondition, EmergencyHospitalSuggestion } from "./types";

export const emergencyApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    /** The 16 conditions (public). */
    emergencyConditions: b.query<EmergencyCondition[], void>({
      query: () => ({ url: "/api/v1/hospital/emergency-conditions", auth: false }),
      keepUnusedDataFor: 3600,
    }),
    /** Hospitals near the patient that handle this condition and have a doctor on duty for it now. */
    emergencySos: b.query<EmergencyHospitalSuggestion[], { emergencyType: string; latitude: number; longitude: number; radiusKm?: number }>({
      query: ({ radiusKm = 10, ...q }) => ({ url: "/api/v1/hospital/emergency-sos", params: { ...q, radiusKm } }),
      keepUnusedDataFor: 30,
    }),
    /** Alerts the hospital. Starts as REQUESTED until the hospital accepts or rejects. */
    createEmergencyBooking: b.mutation<EmergencyBooking, { hospitalId: string; emergencyType: string; patientName: string; patientPhone: string }>({
      query: (body) => ({ url: "/api/v1/hospital/emergency-bookings", method: "POST", body }),
      invalidatesTags: ["EmergencyBookings"],
    }),
    cancelEmergencyBooking: b.mutation<EmergencyBooking, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/api/v1/hospital/emergency-bookings/${id}/cancel`, method: "PATCH", body: { reason } }),
      invalidatesTags: ["EmergencyBookings"],
    }),
    /**
     * The patient's emergency bookings. There is no patient GET-by-id, so a
     * single booking's status (accepted / rejected) is read from here.
     */
    emergencyHistory: b.query<EmergencyBooking[], void>({
      query: () => ({ url: "/api/v1/hospital/emergency-bookings/history" }),
      providesTags: ["EmergencyBookings"],
    }),
  }),
});

export const {
  useEmergencyConditionsQuery,
  useLazyEmergencySosQuery,
  useCreateEmergencyBookingMutation,
  useCancelEmergencyBookingMutation,
  useEmergencyHistoryQuery,
} = emergencyApi;
