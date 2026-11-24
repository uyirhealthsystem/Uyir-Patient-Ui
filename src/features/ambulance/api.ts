// ambulance /api/v1/ambulance/bookings (patient side only).
import { baseApi } from "../../services/baseApi";
import type { Place } from "../../services/types";
import type { AmbulanceBooking, AmbulanceEmergencyType, AmbulancePayment, AmbulanceTrack, AmbulanceType, FareEstimate } from "./types";

type Contact = { contactName: string; contactPhone: string };

export const ambulanceApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    estimateFare: b.mutation<FareEstimate, { pickup: Place; drop: Place; ambulanceType: AmbulanceType }>({
      query: (body) => ({ url: "/api/v1/ambulance/bookings/estimate", method: "POST", body }),
    }),
    bookEmergencyAmbulance: b.mutation<
      AmbulanceBooking,
      Contact & { pickup: Place; drop?: Place; emergencyType: AmbulanceEmergencyType; ambulanceType?: AmbulanceType }
    >({
      query: (body) => ({ url: "/api/v1/ambulance/bookings/emergency", method: "POST", body }),
      invalidatesTags: ["AmbulanceBookings"],
    }),
    scheduleAmbulance: b.mutation<AmbulanceBooking, Contact & { pickup: Place; drop: Place; ambulanceType: AmbulanceType; scheduledAt: string }>({
      query: (body) => ({ url: "/api/v1/ambulance/bookings/scheduled", method: "POST", body }),
      invalidatesTags: ["AmbulanceBookings"],
    }),
    ambulanceBookings: b.query<AmbulanceBooking[], void>({
      query: () => ({ url: "/api/v1/ambulance/bookings" }),
      providesTags: ["AmbulanceBookings"],
    }),
    trackAmbulance: b.query<AmbulanceTrack, string>({
      query: (id) => ({ url: `/api/v1/ambulance/bookings/${id}/track` }),
      providesTags: ["AmbulanceBookings"],
    }),
    cancelAmbulance: b.mutation<AmbulanceBooking, string>({
      query: (id) => ({ url: `/api/v1/ambulance/bookings/${id}/cancel`, method: "POST" }),
      invalidatesTags: ["AmbulanceBookings"],
    }),
    payAmbulance: b.mutation<AmbulancePayment, string>({
      query: (id) => ({ url: `/api/v1/ambulance/bookings/${id}/payment`, method: "POST" }),
      invalidatesTags: ["AmbulanceBookings"],
    }),
  }),
});

export const {
  useEstimateFareMutation,
  useBookEmergencyAmbulanceMutation,
  useScheduleAmbulanceMutation,
  useAmbulanceBookingsQuery,
  useTrackAmbulanceQuery,
  useCancelAmbulanceMutation,
  usePayAmbulanceMutation,
} = ambulanceApi;
