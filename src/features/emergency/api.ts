// hospitalservice emergency SOS (patient side).
import { baseApi } from "../../services/baseApi";
import type { ArrivalMode, EmergencyBooking, EmergencyCondition, EmergencyHospitalSuggestion } from "./types";

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
    /**
     * Tells the hospital which ambulance is bringing the patient, so it can follow it live.
     * The ambulance booking must be the same patient's; linking again replaces it.
     */
    linkEmergencyAmbulance: b.mutation<EmergencyBooking, { id: string; ambulanceBookingId: string }>({
      query: ({ id, ambulanceBookingId }) => ({ url: `/api/v1/hospital/emergency-bookings/${id}/ambulance`, method: "PATCH", body: { ambulanceBookingId } }),
      invalidatesTags: ["EmergencyBookings"],
    }),
    /** How the patient is getting to the hospital. OTHER_AMBULANCE / OWN_WAY: the hospital follows the patient's phone. */
    setEmergencyArrivalMode: b.mutation<EmergencyBooking, { id: string; mode: ArrivalMode }>({
      query: ({ id, mode }) => ({ url: `/api/v1/hospital/emergency-bookings/${id}/arrival-mode`, method: "PATCH", body: { mode } }),
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
  useLinkEmergencyAmbulanceMutation,
  useSetEmergencyArrivalModeMutation,
  useCancelEmergencyBookingMutation,
  useEmergencyHistoryQuery,
} = emergencyApi;
