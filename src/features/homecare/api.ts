// homebasedcare /api/v1/hbc (patient side only).
import { baseApi } from "../../services/baseApi";
import type { CareBooking, CareBookingInput, CarePayResponse, CareService, CareType } from "./types";

export const homeCareApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    careServices: b.query<CareService[], CareType | undefined>({
      query: (careType) => ({ url: "/api/v1/hbc/catalog/services", params: { careType } }),
    }),
    createCareBooking: b.mutation<CareBooking, CareBookingInput>({
      query: (body) => ({ url: "/api/v1/hbc/patient/bookings", method: "POST", body }),
      invalidatesTags: ["CareBookings"],
    }),
    careBookings: b.query<CareBooking[], void>({
      query: () => ({ url: "/api/v1/hbc/patient/bookings" }),
      providesTags: ["CareBookings"],
    }),
    careBooking: b.query<CareBooking, string>({
      query: (id) => ({ url: `/api/v1/hbc/patient/bookings/${id}` }),
      providesTags: ["CareBookings"],
    }),
    payCareBooking: b.mutation<CarePayResponse, string>({
      query: (id) => ({ url: `/api/v1/hbc/patient/bookings/${id}/pay`, method: "POST", body: {} }),
      invalidatesTags: ["CareBookings"],
    }),
    cancelCareBooking: b.mutation<CareBooking, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/api/v1/hbc/patient/bookings/${id}/cancel`, method: "POST", body: { reason } }),
      invalidatesTags: ["CareBookings"],
    }),
  }),
});

export const {
  useCareServicesQuery,
  useCreateCareBookingMutation,
  useCareBookingsQuery,
  useCareBookingQuery,
  usePayCareBookingMutation,
  useCancelCareBookingMutation,
} = homeCareApi;
