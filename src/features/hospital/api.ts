// hospitalservice /api/v1/hospital (patient side only): hospitals, doctors, appointments.
// Emergency SOS endpoints are in features/emergency/api.ts.
import { baseApi } from "../../services/baseApi";
import type { PageResponse } from "../../services/types";
import type {
  Appointment,
  AppointmentRequest,
  Doctor,
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
  useAvailabilityQuery,
  useBookAppointmentMutation,
  useAppointmentHistoryQuery,
  useCancelAppointmentMutation,
} = hospitalApi;
