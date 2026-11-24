// hospitalservice /api/v1/hospital (patient side only).
import { baseApi } from "../../services/baseApi";
import type { PageResponse } from "../../services/types";
import type {
  Appointment,
  AppointmentRequest,
  Doctor,
  EmergencyBooking,
  EmergencyCondition,
  EmergencyHospitalSuggestion,
  Hospital,
  HospitalType,
  SpecialtyCategory,
  TokenAvailability,
} from "./types";

export const hospitalApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    searchHospitals: b.query<PageResponse<Hospital>, { city?: string; hospitalType?: HospitalType; page?: number; size?: number }>({
      query: (q) => ({ url: "/api/v1/hospital", params: { active: true, page: 0, size: 20, sort: "hospitalName,asc", ...q } }),
    }),
    nearbyHospitals: b.query<Hospital[], { latitude: number; longitude: number; radiusKm?: number }>({
      query: ({ radiusKm = 10, ...q }) => ({ url: "/api/v1/hospital/nearby", params: { ...q, radiusKm } }),
    }),
    hospital: b.query<Hospital, string>({
      query: (id) => ({ url: `/api/v1/hospital/${id}` }),
    }),
    specialties: b.query<SpecialtyCategory[], void>({
      query: () => ({ url: "/api/v1/hospital/specialties" }),
      keepUnusedDataFor: 3600,
    }),

    doctor: b.query<Doctor, string>({
      query: (id) => ({ url: `/api/v1/hospital/doctors/${id}` }),
    }),
    searchDoctors: b.query<PageResponse<Doctor>, { specialty?: string; hospitalId?: string; page?: number }>({
      query: ({ page = 0, ...filter }) => ({
        url: "/api/v1/hospital/doctors/search",
        method: "POST",
        body: { ...filter, active: true },
        params: { page, size: 20, sort: "name,asc" },
      }),
    }),

    emergencyConditions: b.query<EmergencyCondition[], void>({
      query: () => ({ url: "/api/v1/hospital/emergency-conditions" }),
      keepUnusedDataFor: 3600,
    }),
    emergencySos: b.query<EmergencyHospitalSuggestion[], { emergencyType: string; latitude: number; longitude: number; radiusKm?: number }>({
      query: ({ radiusKm = 10, ...q }) => ({ url: "/api/v1/hospital/emergency-sos", params: { ...q, radiusKm } }),
    }),
    createEmergencyBooking: b.mutation<EmergencyBooking, { hospitalId: string; emergencyType: string; patientName: string; patientPhone: string }>({
      query: (body) => ({ url: "/api/v1/hospital/emergency-bookings", method: "POST", body }),
      invalidatesTags: ["EmergencyBookings"],
    }),
    cancelEmergencyBooking: b.mutation<EmergencyBooking, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/api/v1/hospital/emergency-bookings/${id}/cancel`, method: "PATCH", body: { reason } }),
      invalidatesTags: ["EmergencyBookings"],
    }),
    emergencyHistory: b.query<EmergencyBooking[], void>({
      query: () => ({ url: "/api/v1/hospital/emergency-bookings/history" }),
      providesTags: ["EmergencyBookings"],
    }),

    availability: b.query<TokenAvailability, { hospitalId: string; doctorId: string; date: string }>({
      query: (params) => ({ url: "/api/v1/hospital/doctor-appointments/availability", params }),
      providesTags: ["Appointments"],
    }),
    bookAppointment: b.mutation<Appointment, AppointmentRequest>({
      query: (body) => ({ url: "/api/v1/hospital/doctor-appointments", method: "POST", body }),
      invalidatesTags: ["Appointments"],
    }),
    appointmentHistory: b.query<Appointment[], void>({
      query: () => ({ url: "/api/v1/hospital/doctor-appointments/history" }),
      providesTags: ["Appointments"],
    }),
    cancelAppointment: b.mutation<Appointment, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/api/v1/hospital/doctor-appointments/${id}/cancel`, method: "PATCH", body: { reason } }),
      invalidatesTags: ["Appointments"],
    }),
  }),
});

export const {
  useLazySearchHospitalsQuery,
  useLazyNearbyHospitalsQuery,
  useHospitalQuery,
  useSpecialtiesQuery,
  useDoctorQuery,
  useSearchDoctorsQuery,
  useLazySearchDoctorsQuery,
  useEmergencyConditionsQuery,
  useLazyEmergencySosQuery,
  useCreateEmergencyBookingMutation,
  useCancelEmergencyBookingMutation,
  useEmergencyHistoryQuery,
  useAvailabilityQuery,
  useBookAppointmentMutation,
  useAppointmentHistoryQuery,
  useCancelAppointmentMutation,
} = hospitalApi;
