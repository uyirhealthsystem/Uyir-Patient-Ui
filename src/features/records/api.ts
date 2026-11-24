// userservice medical records: conditions, allergies, medications, vitals,
// provider health records and the combined medical summary.
import { baseApi } from "../../services/baseApi";
import type { HealthRecord, MedicalHistory } from "./types";

export type MedicalKind = "conditions" | "allergies" | "medications" | "vitals";
const ONE: Record<MedicalKind, string> = { conditions: "condition", allergies: "allergy", medications: "medication", vitals: "vital" };

type MemberQuery = { memberId?: string };
export type HealthRecordsPage = { healthRecords: HealthRecord[]; next: { before: string; beforeId: string } | null };

export const recordsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    medicalList: b.query<any[], { kind: MedicalKind } & MemberQuery>({
      query: ({ kind, memberId }) => ({ url: `/api/v1/users/me/medical/${kind}`, params: { memberId } }),
      transformResponse: (r: Record<string, any[]>, _m, { kind }) => r[kind] ?? [],
      providesTags: (_r, _e, { kind }) => [{ type: "Medical", id: kind }],
    }),
    createMedical: b.mutation<any, { kind: MedicalKind; body: Record<string, unknown> }>({
      query: ({ kind, body }) => ({ url: `/api/v1/users/me/medical/${kind}`, method: "POST", body }),
      transformResponse: (r: Record<string, any>, _m, { kind }) => r[ONE[kind]],
      invalidatesTags: (_r, _e, { kind }) => [{ type: "Medical", id: kind }, "MedicalHistory"],
    }),
    updateMedical: b.mutation<any, { kind: MedicalKind; id: string; body: Record<string, unknown> }>({
      query: ({ kind, id, body }) => ({ url: `/api/v1/users/me/medical/${kind}/${id}`, method: "PATCH", body }),
      transformResponse: (r: Record<string, any>, _m, { kind }) => r[ONE[kind]],
      invalidatesTags: (_r, _e, { kind }) => [{ type: "Medical", id: kind }, "MedicalHistory"],
    }),
    removeMedical: b.mutation<void, { kind: MedicalKind; id: string }>({
      query: ({ kind, id }) => ({ url: `/api/v1/users/me/medical/${kind}/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { kind }) => [{ type: "Medical", id: kind }, "MedicalHistory"],
    }),

    healthRecords: b.query<HealthRecordsPage, MemberQuery & { before?: string; beforeId?: string }>({
      query: (params) => ({ url: "/api/v1/users/me/health-records", params }),
      providesTags: ["HealthRecords"],
    }),
    healthRecord: b.query<HealthRecord, string>({
      query: (id) => ({ url: `/api/v1/users/me/health-records/${id}` }),
      transformResponse: (r: { healthRecord: HealthRecord }) => r.healthRecord,
    }),
    medicalHistory: b.query<MedicalHistory, MemberQuery>({
      query: (params) => ({ url: "/api/v1/users/me/medical-history", params }),
      providesTags: ["MedicalHistory"],
    }),
  }),
});

export const {
  useMedicalListQuery,
  useCreateMedicalMutation,
  useUpdateMedicalMutation,
  useRemoveMedicalMutation,
  useHealthRecordsQuery,
  useLazyHealthRecordsQuery,
  useHealthRecordQuery,
  useMedicalHistoryQuery,
} = recordsApi;
