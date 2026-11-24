// userservice /api/v1/users: profile, family members, ABHA.
import { PRIVACY_NOTICE_VERSION } from "../../config";
import { baseApi } from "../../services/baseApi";
import type { AbhaLink, FamilyMember, Me, Profile, ProfileInput } from "./types";

export type AbhaNext = "MOBILE_VERIFY" | "ABHA_ADDRESS" | "DONE";
export type FamilyMemberInput = Omit<FamilyMember, "id" | "age">;

export const profileApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    onboard: b.mutation<Me, { profile: ProfileInput & { email: string }; referralCode?: string }>({
      query: ({ profile, referralCode }) => ({
        url: "/api/v1/users/me",
        method: "POST",
        body: {
          ...profile,
          consent: { noticeVersion: PRIVACY_NOTICE_VERSION, adultDeclaration: true },
          ...(referralCode ? { referralCode } : {}),
        },
      }),
    }),
    replaceProfile: b.mutation<Profile, ProfileInput>({
      query: (body) => ({ url: "/api/v1/users/me/profile", method: "PUT", body }),
      transformResponse: (r: { profile: Profile }) => r.profile,
      invalidatesTags: ["MedicalHistory"],
    }),
    eraseAccount: b.mutation<void, void>({
      query: () => ({ url: "/api/v1/users/me", method: "DELETE", body: { confirm: "DELETE_MY_DATA" } }),
    }),

    // ── family members ──
    family: b.query<FamilyMember[], void>({
      query: () => ({ url: "/api/v1/users/me/family-members" }),
      transformResponse: (r: { familyMembers: FamilyMember[] }) => r.familyMembers,
      providesTags: ["Family"],
    }),
    createFamilyMember: b.mutation<FamilyMember, FamilyMemberInput & { consent: { noticeVersion: string; basis: string } }>({
      query: (body) => ({ url: "/api/v1/users/me/family-members", method: "POST", body }),
      transformResponse: (r: { familyMember: FamilyMember }) => r.familyMember,
      invalidatesTags: ["Family"],
    }),
    updateFamilyMember: b.mutation<FamilyMember, { id: string; body: Partial<FamilyMember> }>({
      query: ({ id, body }) => ({ url: `/api/v1/users/me/family-members/${id}`, method: "PATCH", body }),
      transformResponse: (r: { familyMember: FamilyMember }) => r.familyMember,
      invalidatesTags: ["Family"],
    }),
    removeFamilyMember: b.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/users/me/family-members/${id}`, method: "DELETE" }),
      invalidatesTags: ["Family"],
    }),

    // ── ABHA ──
    abhaLinks: b.query<AbhaLink[], void>({
      query: () => ({ url: "/api/v1/users/me/abha" }),
      transformResponse: (r: { abhaLinks: AbhaLink[] }) => r.abhaLinks,
      providesTags: ["Abha"],
    }),
    grantAbhaSharingConsent: b.mutation<unknown, void>({
      query: () => ({
        url: "/api/v1/users/me/consents",
        method: "POST",
        body: { purpose: "ABDM_SHARING", noticeVersion: "1", adultDeclaration: true },
      }),
    }),
    // A GET, but run on demand inside the ABHA flow, so it is a mutation.
    abhaConsentText: b.mutation<{ code: string; version: string; language: string; text: string }, void>({
      query: () => ({ url: "/api/v1/users/me/abha/create/consent-text" }),
    }),
    sendAadhaarOtp: b.mutation<{ message: string; expiresAt: string }, { aadhaar: string; version: string }>({
      query: ({ aadhaar, version }) => ({
        url: "/api/v1/users/me/abha/create/aadhaar/otp",
        method: "POST",
        body: { aadhaar, consent: { accepted: true, version } },
      }),
    }),
    verifyAadhaarOtp: b.mutation<{ abhaLink: AbhaLink; isNew: boolean; next: AbhaNext }, { otp: string; mobile: string }>({
      query: (body) => ({ url: "/api/v1/users/me/abha/create/aadhaar/verify", method: "POST", body }),
      invalidatesTags: ["Abha", "MedicalHistory"],
    }),
    sendAbhaMobileOtp: b.mutation<{ message: string }, void>({
      query: () => ({ url: "/api/v1/users/me/abha/create/mobile/otp", method: "POST", body: {} }),
    }),
    verifyAbhaMobileOtp: b.mutation<{ next: AbhaNext }, string>({
      query: (otp) => ({ url: "/api/v1/users/me/abha/create/mobile/verify", method: "POST", body: { otp } }),
    }),
    // A GET, but run on demand inside the ABHA flow, so it is a mutation.
    abhaAddressSuggestions: b.mutation<{ suggestions: string[]; suffix: string }, void>({
      query: () => ({ url: "/api/v1/users/me/abha/create/address-suggestions" }),
    }),
    chooseAbhaAddress: b.mutation<{ abhaLink: AbhaLink }, string>({
      query: (abhaAddress) => ({ url: "/api/v1/users/me/abha/create/address", method: "POST", body: { abhaAddress } }),
      invalidatesTags: ["Abha", "MedicalHistory"],
    }),
    cancelAbhaCreation: b.mutation<void, void>({
      query: () => ({ url: "/api/v1/users/me/abha/create", method: "DELETE" }),
    }),
  }),
});

export const {
  useOnboardMutation,
  useReplaceProfileMutation,
  useEraseAccountMutation,
  useFamilyQuery,
  useCreateFamilyMemberMutation,
  useUpdateFamilyMemberMutation,
  useRemoveFamilyMemberMutation,
  useAbhaLinksQuery,
  useGrantAbhaSharingConsentMutation,
  useAbhaConsentTextMutation,
  useSendAadhaarOtpMutation,
  useVerifyAadhaarOtpMutation,
  useSendAbhaMobileOtpMutation,
  useVerifyAbhaMobileOtpMutation,
  useAbhaAddressSuggestionsMutation,
  useChooseAbhaAddressMutation,
  useCancelAbhaCreationMutation,
} = profileApi;
