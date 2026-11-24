import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isApiError } from "../../../services/http";
import { useOnboardMutation } from "../../profile/api";
import { BLOOD_GROUPS, type BloodGroup } from "../../profile/types";
import { useAuth } from "../../auth/useAuth";
import { useAction } from "../../../lib/hooks";
import { DISTRICT_OPTIONS } from "../../../lib/places";
import { Body, Button, ErrorBox, Ionicons, KV, Row, Screen, humanize } from "../../../ui/components";
import { ageOf, CheckCard, DateOfBirthField, formatDob, GridChoice, IconChoice, PhoneField, QuestionCard, SelectField, TextField } from "../../../ui/pickers";
import { colors, space } from "../../../ui/theme";
import { draftFrom, toProfileInput, validateDraft, type DraftErrors, type DraftKey, type ProfileDraft } from "../../profile/components/ProfileForm";

const GENDER_OPTIONS = [
  { value: "MALE" as const, label: "Male", icon: "male" as const },
  { value: "FEMALE" as const, label: "Female", icon: "female" as const },
  { value: "OTHER" as const, label: "Other", icon: "male-female" as const },
];
const BLOOD_OPTIONS = [...BLOOD_GROUPS.map((b) => ({ value: b as BloodGroup | "UNKNOWN", label: b })), { value: "UNKNOWN" as const, label: "Not sure" }];

export default function OnboardingScreen() {
  const { setMe, logout, accountEmail } = useAuth();
  const STEPS: { title: string; subtitle: string; keys: DraftKey[] }[] = [
    { title: "About you", subtitle: "A few basics so doctors know who they're treating.", keys: ["fullName", "dateOfBirth", "gender"] },
    { title: "Contact & health", subtitle: "How we reach you, and one detail that helps in an emergency.", keys: ["phone"] },
    { title: "Where you live", subtitle: "So ambulances and home care can find you.", keys: ["district", "pinCode"] },
    { title: "Almost done", subtitle: "Check your details and confirm.", keys: [] },
  ];

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFrom(null, accountEmail));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [showReferral, setShowReferral] = useState(false);
  const [referral, setReferral] = useState("");
  const [referralError, setReferralError] = useState<string>();
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState<string>();
  const { busy, error, setError, run } = useAction();
  const [onboard] = useOnboardMutation();

  const set = <K extends DraftKey>(k: K) => (v: ProfileDraft[K]) => {
    const d = { ...draft, [k]: v };
    setDraft(d);
    // Clear (or update) this field's error as soon as the user fixes it.
    if (errors[k]) setErrors({ ...errors, [k]: validateDraft(d, [k], { adult: true })[k] });
  };

  const goNext = () => {
    const e = validateDraft(draft, STEPS[step].keys, { adult: true });
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(step + 1);
  };

  const submit = () => {
    for (let i = 0; i < 3; i++) {
      const e = validateDraft(draft, STEPS[i].keys, { adult: true });
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return;
      }
    }
    if (!agreed) return setConsentError("Please tick this box to continue.");
    // The email comes from the signed-in account (the access token's email claim).
    const email = accountEmail || draft.email;
    if (!email) return setError("We couldn't read your account email. Please sign out and sign in again.");
    setReferralError(undefined);
    setError(null);
    run(async () => {
      try {
        const body = toProfileInput({ ...draft, email });
        setMe(await onboard({ profile: { ...body, email }, referralCode: referral.trim() || undefined }).unwrap());
      } catch (e) {
        if (isApiError(e) && e.code === "INVALID_REFERRAL_CODE") {
          setReferralError("We couldn't find that referral code. Check it, or remove it to continue.");
          return;
        }
        throw e;
      }
    });
  };

  const info = STEPS[step];
  const last = step === STEPS.length - 1;
  const age = draft.dateOfBirth ? ageOf(draft.dateOfBirth) : null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
      {/* Header + progress */}
      <View style={s.header}>
        <Row style={{ justifyContent: "space-between" }}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(step - 1)} hitSlop={10} style={s.back} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <View style={{ width: 34 }} />
          )}
          <Text style={s.stepCount}>
            Step {step + 1} of {STEPS.length}
          </Text>
          <Pressable onPress={() => logout()} hitSlop={10}>
            <Text style={s.signOut}>Sign out</Text>
          </Pressable>
        </Row>
        <View style={s.progress}>
          {STEPS.map((_, i) => (
            <View key={i} style={[s.bar, i <= step && { backgroundColor: colors.primary }]} />
          ))}
        </View>
        <Text style={s.title}>{info.title}</Text>
        <Text style={s.subtitle}>{info.subtitle}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Screen
          key={step}
          footer={
            last ? (
              <Button title="Create my profile" icon="checkmark-circle-outline" onPress={submit} loading={busy} />
            ) : (
              <Button title="Continue" icon="arrow-forward" onPress={goNext} />
            )
          }
        >
          {step === 0 ? (
            <>
              <QuestionCard icon="person-outline" title="What's your full name?" subtitle="As written on your Aadhaar or ID card.">
                <TextField label="" value={draft.fullName} onChangeText={set("fullName")} error={errors.fullName} placeholder="e.g. Priya Raman" autoComplete="name" autoCapitalize="words" />
              </QuestionCard>
              <QuestionCard icon="calendar-outline" title="When were you born?" subtitle="Tap below to open the calendar: pick your birth year, then the day.">
                <DateOfBirthField label="" value={draft.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} />
              </QuestionCard>
              <QuestionCard icon="male-female-outline" title="Gender">
                <IconChoice label="" options={GENDER_OPTIONS} value={draft.gender} onChange={set("gender")} error={errors.gender} />
              </QuestionCard>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <QuestionCard icon="call-outline" tone="green" title="Mobile number" subtitle="Hospitals and ambulance drivers call this number.">
                <PhoneField label="" value={draft.phone} onChange={set("phone")} error={errors.phone} />
              </QuestionCard>
              <QuestionCard icon="water-outline" tone="red" title="Blood group" subtitle="Helps doctors in an emergency." optional>
                <GridChoice label="" options={BLOOD_OPTIONS} value={draft.bloodGroup} onChange={set("bloodGroup")} columns={3} />
              </QuestionCard>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <QuestionCard icon="location-outline" tone="violet" title="District">
                <SelectField
                  label=""
                  value={draft.district}
                  onChange={set("district")}
                  options={DISTRICT_OPTIONS}
                  placeholder="Choose your district"
                  searchPlaceholder="Search districts"
                  allowOther
                  error={errors.district}
                />
              </QuestionCard>
              <QuestionCard icon="home-outline" tone="violet" title="Home address" subtitle="House number, street and area." optional>
                <TextField label="" value={draft.address} onChangeText={set("address")} placeholder="e.g. 12, Gandhi Street, Anna Nagar" multiline />
              </QuestionCard>
              <QuestionCard icon="keypad-outline" tone="violet" title="PIN code" optional>
                <TextField label="" value={draft.pinCode} onChangeText={(t) => set("pinCode")(t.replace(/\D/g, ""))} error={errors.pinCode} keyboardType="number-pad" maxLength={6} placeholder="600001" />
              </QuestionCard>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <ReviewCard title="About you" icon="person-outline" onEdit={() => setStep(0)}>
                <KV k="Name" v={draft.fullName} />
                <KV k="Date of birth" v={draft.dateOfBirth ? `${formatDob(draft.dateOfBirth)}${age != null ? ` (${age} yrs)` : ""}` : undefined} />
                <KV k="Gender" v={draft.gender ? humanize(draft.gender) : undefined} />
              </ReviewCard>
              <ReviewCard title="Contact & health" icon="call-outline" onEdit={() => setStep(1)}>
                <KV k="Mobile" v={draft.phone ? `+91 ${draft.phone.slice(0, 5)} ${draft.phone.slice(5)}` : undefined} />
                <KV k="Blood group" v={draft.bloodGroup && draft.bloodGroup !== "UNKNOWN" ? draft.bloodGroup : "Not sure"} />
              </ReviewCard>
              <ReviewCard title="Where you live" icon="location-outline" onEdit={() => setStep(2)}>
                <KV k="District" v={draft.district} />
                <KV k="Address" v={draft.address || "—"} />
                <KV k="PIN code" v={draft.pinCode || "—"} />
              </ReviewCard>

              {showReferral ? (
                <QuestionCard icon="pricetag-outline" tone="amber" title="Referral code" subtitle="From a Uyir Health Partner." optional>
                  <TextField
                    label=""
                    value={referral}
                    onChangeText={(t) => {
                      setReferral(t.toUpperCase());
                      setReferralError(undefined);
                    }}
                    autoCapitalize="characters"
                    maxLength={30}
                    placeholder="e.g. HP1A2B3C"
                    error={referralError}
                  />
                </QuestionCard>
              ) : (
                <Pressable onPress={() => setShowReferral(true)} style={s.referralLink}>
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                  <Text style={s.link}>Have a referral code?</Text>
                </Pressable>
              )}

              <CheckCard
                checked={agreed}
                onToggle={() => {
                  setAgreed(!agreed);
                  setConsentError(undefined);
                }}
                title="I am 18 or older and I agree to the privacy notice"
                error={consentError}
              >
                <Body muted style={{ fontSize: 13, lineHeight: 18 }}>
                  Uyir stores your health information to arrange your care and shares it only with the doctors, hospitals and care providers you
                  book. You can delete your data any time from your profile.
                </Body>
              </CheckCard>

              {error ? <ErrorBox message={error} /> : null}
            </>
          ) : null}
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewCard({ title, icon, onEdit, children }: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; onEdit: () => void; children: React.ReactNode }) {
  return (
    <View style={s.review}>
      <Row style={{ justifyContent: "space-between", marginBottom: space.xs }}>
        <Row>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <Text style={s.reviewTitle}>{title}</Text>
        </Row>
        <Pressable onPress={onEdit} hitSlop={8} style={s.editBtn}>
          <Ionicons name="create-outline" size={14} color={colors.primary} />
          <Text style={s.editText}>Edit</Text>
        </Pressable>
      </Row>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  stepCount: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  signOut: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  progress: { flexDirection: "row", gap: 6, marginTop: space.md, marginBottom: space.md },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.graySoft },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 13.5 },
  referralLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  review: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 2 },
  reviewTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.primarySoft },
  editText: { color: colors.primary, fontWeight: "800", fontSize: 12.5 },
});
