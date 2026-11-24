import { useState } from "react";
import { Alert, View } from "react-native";
import { useCreateFamilyMemberMutation, useRemoveFamilyMemberMutation, useUpdateFamilyMemberMutation } from "../api";
import { BLOOD_GROUPS, RELATIONSHIPS, type BloodGroup, type Gender, type Relationship } from "../types";
import { PRIVACY_NOTICE_VERSION } from "../../../config";
import { DISTRICT_OPTIONS } from "../../../lib/places";
import { useAction } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Button, ErrorBox, Screen, humanize, type IconName } from "../../../ui/components";
import { Chips, OptionCards } from "../../../ui/form";
import { DateOfBirthField, GENDER_OPTIONS, GridChoice, IconChoice, PhoneField, QuestionCard, SelectField, TextField } from "../../../ui/pickers";
import { space } from "../../../ui/theme";

type Basis = "MEMBER_CONSENTED" | "PARENT_OR_GUARDIAN";
type Errors = Partial<Record<"fullName" | "relationship" | "phone" | "pinCode" | "basis", string>>;

const REL_ICON: Partial<Record<Relationship, IconName>> = {
  SPOUSE: "heart-outline",
  FATHER: "man-outline",
  MOTHER: "woman-outline",
  SON: "happy-outline",
  DAUGHTER: "happy-outline",
};
const REL_OPTIONS = RELATIONSHIPS.map((r) => ({ value: r, label: humanize(r), icon: REL_ICON[r] }));
const BLOOD_OPTIONS = [...BLOOD_GROUPS.map((b) => ({ value: b as BloodGroup | "UNKNOWN", label: b })), { value: "UNKNOWN" as const, label: "Not sure" }];

export default function FamilyMemberFormScreen({ navigation, route }: AppScreen<"FamilyMemberForm">) {
  const existing = route.params?.member;
  const [fullName, setFullName] = useState(existing?.fullName ?? "");
  const [relationship, setRelationship] = useState<Relationship | null>(existing?.relationship ?? null);
  const [dob, setDob] = useState(existing?.dateOfBirth?.slice(0, 10) ?? "");
  const [gender, setGender] = useState<Gender | null>(existing?.gender ?? null);
  const [phone, setPhone] = useState((existing?.phone ?? "").replace(/\D/g, "").slice(-10));
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "UNKNOWN" | null>(existing?.bloodGroup ?? null);
  const [district, setDistrict] = useState(existing?.district ?? "");
  const [pinCode, setPinCode] = useState(existing?.pinCode ?? "");
  const [basis, setBasis] = useState<Basis | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const { busy, error, run } = useAction();
  const [createMember] = useCreateFamilyMemberMutation();
  const [updateMember] = useUpdateFamilyMemberMutation();
  const [removeMember] = useRemoveFamilyMemberMutation();

  const save = () => {
    const e: Errors = {};
    if (fullName.trim().length < 2) e.fullName = "Please enter their full name.";
    if (!relationship) e.relationship = "How are they related to you?";
    if (phone && !/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter a valid 10-digit mobile number, or leave it empty.";
    if (pinCode && !/^[1-9]\d{5}$/.test(pinCode)) e.pinCode = "PIN code is 6 digits.";
    if (!existing && !basis) e.basis = "Please confirm this to continue.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const opt = (s: string) => (s.trim() ? s.trim() : null);
    const body = {
      fullName: fullName.trim().replace(/\s+/g, " "),
      relationship: relationship!,
      dateOfBirth: opt(dob),
      gender,
      phone: opt(phone),
      bloodGroup: bloodGroup && bloodGroup !== "UNKNOWN" ? bloodGroup : null,
      district: opt(district),
      pinCode: opt(pinCode),
    };
    run(async () => {
      if (existing) await updateMember({ id: existing.id, body }).unwrap();
      else await createMember({ ...body, consent: { noticeVersion: PRIVACY_NOTICE_VERSION, basis: basis! } }).unwrap();
      navigation.goBack();
    });
  };

  const remove = () =>
    Alert.alert("Remove family member?", "Their medical records stored in Uyir are deleted too.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          run(async () => {
            await removeMember(existing!.id).unwrap();
            navigation.goBack();
          }),
      },
    ]);

  const clear = (k: keyof Errors) => errors[k] && setErrors({ ...errors, [k]: undefined });

  return (
    <Screen footer={<Button title={existing ? "Save changes" : "Add family member"} icon="checkmark" onPress={save} loading={busy} />}>
      <QuestionCard icon="person-add-outline" title="Who are they?" subtitle="Their name as on their ID card.">
        <TextField label="Full name" required icon="person-outline" value={fullName} onChangeText={(t) => { setFullName(t); clear("fullName"); }} error={errors.fullName} placeholder="e.g. Lakshmi R" autoCapitalize="words" autoComplete="off" />
        <Chips label="Relationship" required options={REL_OPTIONS} value={relationship} onChange={(r) => { setRelationship(r); clear("relationship"); }} error={errors.relationship} />
      </QuestionCard>

      <QuestionCard icon="body-outline" tone="violet" title="About them" subtitle="Helps doctors and ambulance crews." optional>
        <DateOfBirthField value={dob} onChange={setDob} defaultYear={relationship === "SON" || relationship === "DAUGHTER" || relationship === "GRANDCHILD" ? 2015 : relationship === "GRANDPARENT" ? 1950 : 1970} />
        <IconChoice label="Gender" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        <GridChoice label="Blood group" options={BLOOD_OPTIONS} value={bloodGroup} onChange={setBloodGroup} columns={3} />
      </QuestionCard>

      <QuestionCard icon="call-outline" tone="green" title="Contact" subtitle="Leave the number empty to use yours." optional>
        <PhoneField value={phone} onChange={(v) => { setPhone(v); clear("phone"); }} error={errors.phone} />
        <SelectField label="District" icon="location-outline" value={district} onChange={setDistrict} options={DISTRICT_OPTIONS} placeholder="Choose district" searchPlaceholder="Search districts" allowOther />
        <TextField label="PIN code" icon="keypad-outline" value={pinCode} onChangeText={(t) => { setPinCode(t.replace(/\D/g, "")); clear("pinCode"); }} error={errors.pinCode} keyboardType="number-pad" maxLength={6} placeholder="600001" />
      </QuestionCard>

      {!existing ? (
        <QuestionCard icon="shield-checkmark-outline" tone="amber" title="Consent" subtitle="Needed to store another person's health information.">
          <OptionCards
            options={[
              { value: "MEMBER_CONSENTED", label: "They agreed", description: "They know and are happy for me to keep their records here.", icon: "hand-left-outline" },
              { value: "PARENT_OR_GUARDIAN", label: "I'm their parent or guardian", description: "For a child, or someone I legally look after.", icon: "people-outline" },
            ]}
            value={basis}
            onChange={(b) => { setBasis(b); clear("basis"); }}
            error={errors.basis}
          />
        </QuestionCard>
      ) : null}

      {error ? <ErrorBox message={error} /> : null}
      {existing ? (
        <View style={{ marginTop: space.sm }}>
          <Button title="Remove family member" icon="trash-outline" variant="dangerOutline" onPress={remove} />
        </View>
      ) : null}
    </Screen>
  );
}
