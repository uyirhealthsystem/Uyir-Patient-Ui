import { View } from "react-native";
import { BLOOD_GROUPS, type BloodGroup, type Gender, type Profile, type ProfileInput } from "../../api/types";
import { DISTRICT_OPTIONS } from "../../lib/places";
import { ageOf, DateOfBirthField, GENDER_OPTIONS, GridChoice, IconChoice, PhoneField, SelectField, TextField } from "../../ui/pickers";
import { space } from "../../ui/theme";

export type ProfileDraft = {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD or ""
  gender: Gender | null;
  phone: string; // 10 digits or ""
  email: string;
  bloodGroup: BloodGroup | "UNKNOWN" | null;
  address: string;
  district: string;
  pinCode: string;
};
export type DraftKey = keyof ProfileDraft;
export type DraftErrors = Partial<Record<DraftKey, string>>;

export function draftFrom(p?: Partial<Profile> | null, fallbackEmail = ""): ProfileDraft {
  return {
    fullName: p?.fullName ?? "",
    dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
    gender: p?.gender ?? null,
    phone: (p?.phone ?? "").replace(/\D/g, "").slice(-10),
    email: p?.email ?? fallbackEmail,
    bloodGroup: p?.bloodGroup ?? null,
    address: p?.address ?? "",
    district: p?.district ?? "",
    pinCode: p?.pinCode ?? "",
  };
}

// Which fields each section owns, so a step only checks its own fields.
export const ABOUT_FIELDS: DraftKey[] = ["fullName", "dateOfBirth", "gender", "bloodGroup"];
// Email isn't edited here: it's the sign-in account's email (from the access token).
export const CONTACT_FIELDS: DraftKey[] = ["phone", "address", "district", "pinCode"];

/** Same rules as userservice, phrased for people. `adult` = the account holder (must be 18+). */
export function validateDraft(d: ProfileDraft, keys: DraftKey[], { adult = false } = {}): DraftErrors {
  const e: DraftErrors = {};
  const want = (k: DraftKey) => keys.includes(k);
  if (want("fullName")) {
    if (!d.fullName.trim()) e.fullName = "Please enter your full name.";
    else if (d.fullName.trim().length < 2) e.fullName = "That name looks too short.";
  }
  if (want("dateOfBirth")) {
    if (!d.dateOfBirth) e.dateOfBirth = "Please select your date of birth.";
    else if (adult && (ageOf(d.dateOfBirth) ?? 0) < 18)
      e.dateOfBirth = "You need to be 18 or older to create an account. A parent or guardian can add you as a family member.";
  }
  if (want("gender") && !d.gender) e.gender = "Please choose one.";
  if (want("phone")) {
    if (!d.phone) e.phone = "Please enter your mobile number.";
    else if (!/^[6-9]\d{9}$/.test(d.phone)) e.phone = "Enter a valid 10-digit mobile number.";
  }
  if (want("email")) {
    if (!d.email.trim()) e.email = "Please enter your email.";
    else if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) e.email = "Enter a valid email address.";
  }
  if (want("district") && !d.district.trim()) e.district = "Please choose your district.";
  if (want("pinCode") && d.pinCode && !/^[1-9]\d{5}$/.test(d.pinCode)) e.pinCode = "PIN code is 6 digits.";
  return e;
}

export function toProfileInput(d: ProfileDraft): ProfileInput {
  const opt = (s: string) => (s.trim() ? s.trim() : null);
  return {
    fullName: d.fullName.trim().replace(/\s+/g, " "),
    dateOfBirth: opt(d.dateOfBirth),
    gender: d.gender,
    phone: opt(d.phone),
    email: opt(d.email),
    bloodGroup: d.bloodGroup && d.bloodGroup !== "UNKNOWN" ? d.bloodGroup : null,
    address: opt(d.address),
    district: opt(d.district),
    pinCode: opt(d.pinCode),
  };
}

const BLOOD_OPTIONS = [...BLOOD_GROUPS.map((b) => ({ value: b as BloodGroup | "UNKNOWN", label: b })), { value: "UNKNOWN" as const, label: "Not sure" }];

type SectionProps = { draft: ProfileDraft; onChange: (d: ProfileDraft) => void; errors: DraftErrors };
const setter = (p: SectionProps) => <K extends DraftKey>(k: K) => (v: ProfileDraft[K]) => p.onChange({ ...p.draft, [k]: v });

export function AboutFields(p: SectionProps) {
  const set = setter(p);
  const { draft: d, errors: e } = p;
  return (
    <View style={{ gap: space.lg }}>
      <TextField label="Full name" required icon="person-outline" value={d.fullName} onChangeText={set("fullName")} error={e.fullName} placeholder="As on your ID card" autoComplete="name" autoCapitalize="words" returnKeyType="done" />
      <DateOfBirthField required value={d.dateOfBirth} onChange={set("dateOfBirth")} error={e.dateOfBirth} />
      <IconChoice label="Gender" required options={GENDER_OPTIONS} value={d.gender} onChange={set("gender")} error={e.gender} />
      <GridChoice label="Blood group" hint="Helps in an emergency. Skip it or pick “Not sure” if you don't know." options={BLOOD_OPTIONS} value={d.bloodGroup} onChange={set("bloodGroup")} columns={3} />
    </View>
  );
}

export function ContactFields(p: SectionProps) {
  const set = setter(p);
  const { draft: d, errors: e } = p;
  return (
    <View style={{ gap: space.lg }}>
      <PhoneField required value={d.phone} onChange={set("phone")} error={e.phone} hint="Hospitals and ambulance drivers use this to reach you." />
      <TextField label="Address" icon="home-outline" value={d.address} onChangeText={set("address")} placeholder="House no., street, area" multiline />
      <SelectField label="District" required icon="location-outline" value={d.district} onChange={set("district")} options={DISTRICT_OPTIONS} placeholder="Choose your district" searchPlaceholder="Search districts" allowOther error={e.district} />
      <TextField label="PIN code" icon="keypad-outline" value={d.pinCode} onChangeText={(t) => set("pinCode")(t.replace(/\D/g, ""))} error={e.pinCode} keyboardType="number-pad" maxLength={6} placeholder="600001" />
    </View>
  );
}
