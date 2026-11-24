// userservice: the patient, their profile, family and ABHA links.

export type Gender = "MALE" | "FEMALE" | "OTHER";

export const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export interface Profile {
  fullName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  bloodGroup: BloodGroup | null;
  address: string | null;
  district: string | null;
  pinCode: string | null;
  age: number | null;
}

export interface Me {
  user: { id: string; patientNumber: string; [k: string]: unknown };
  profile: Profile;
  privacy?: { noticeVersion: string; consentRequired: boolean };
}

export interface ProfileInput {
  fullName: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  bloodGroup?: BloodGroup | null;
  address?: string | null;
  district?: string | null;
  pinCode?: string | null;
}

export const RELATIONSHIPS = [
  "SPOUSE",
  "FATHER",
  "MOTHER",
  "SON",
  "DAUGHTER",
  "BROTHER",
  "SISTER",
  "GRANDPARENT",
  "GRANDCHILD",
  "OTHER",
] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];

export interface FamilyMember {
  id: string;
  fullName: string;
  relationship: Relationship;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  bloodGroup: BloodGroup | null;
  district: string | null;
  pinCode: string | null;
  age?: number | null;
}

export interface AbhaLink {
  subject?: string;
  abhaNumber: string | null;
  abhaAddress: string | null;
  verifiedAt?: string | null;
  [k: string]: unknown;
}
