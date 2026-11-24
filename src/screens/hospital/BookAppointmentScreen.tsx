import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { hospitalApi, usersApi } from "../../api/endpoints";
import type { Gender, TokenAvailability } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { atTime, dateTime, money, nextDays, TIME_SLOTS, ymd } from "../../lib/format";
import { useAction, useLoad } from "../../lib/hooks";
import { peopleFrom, toBookingRelationship } from "../../lib/people";
import type { AppScreen } from "../../navigation/types";
import { Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Row, Screen, humanize } from "../../ui/components";
import { DayStrip, MultiChips, PersonPicker, Segmented, TimeSlots, time12 } from "../../ui/form";
import { GENDER_OPTIONS, IconChoice, PhoneField, QuestionCard, TextField } from "../../ui/pickers";

export default function BookAppointmentScreen({ navigation, route }: AppScreen<"BookAppointment">) {
  const { hospitalId, doctorId } = route.params;
  const { me } = useAuth();
  const ctx = useLoad(async () => {
    const [hospital, doctor, family] = await Promise.all([
      hospitalApi.byId(hospitalId),
      hospitalApi.doctor(doctorId),
      usersApi.family.list().catch(() => []),
    ]);
    return { hospital, doctor, family };
  }, [hospitalId, doctorId]);

  const people = useMemo(() => peopleFrom(me, ctx.data?.family), [me, ctx.data]);
  const days = useMemo(() => nextDays(14), []);
  const [personKey, setPersonKey] = useState("self");
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<"NEW" | "FOLLOW_UP">("NEW");
  const [reason, setReason] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [otherSymptoms, setOtherSymptoms] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [availability, setAvailability] = useState<TokenAvailability | null>(null);
  const { busy, error, setError, run } = useAction();

  const person = people.find((p) => p.key === personKey);
  useEffect(() => {
    if (!person) return;
    setPhone(person.phone.replace(/D/g, "").slice(-10));
    setAge(person.age != null ? String(person.age) : "");
    setGender(person.gender);
  }, [person?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daily token limit for this doctor, if the hospital set one.
  useEffect(() => {
    setAvailability(null);
    hospitalApi.availability(hospitalId, doctorId, ymd(day)).then(setAvailability).catch(() => setAvailability(null));
  }, [hospitalId, doctorId, day]);

  if (ctx.loading) return <Loading />;
  if (ctx.error || !ctx.data) return <Screen><ErrorBox message={ctx.error ?? "Not found"} onRetry={ctx.refresh} /></Screen>;
  const { hospital, doctor } = ctx.data;
  const fee = doctor.hospitalAssociations?.find((a) => a.hospitalId === hospitalId)?.consultationFee ?? doctor.consultationFee;
  const now = Date.now();
  const slots = TIME_SLOTS.filter((t) => atTime(day, t).getTime() > now + 30 * 60_000);

  const knownAge = person?.age != null;
  const knownGender = !!person?.gender;

  const submit = () => {
    if (!person) return setError("Choose who the appointment is for.");
    if (!slot) return setError("Pick a time for the visit.");
    const ageNum = Number(age);
    if (!age || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 130) return setError("Enter the patient's age.");
    if (!gender) return setError("Choose the patient's gender.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    const when = atTime(day, slot);
    const allSymptoms = [...symptoms, ...otherSymptoms.split(",").map((x) => x.trim()).filter(Boolean)];
    run(async () => {
      const appt = await hospitalApi.bookAppointment({
        hospitalId,
        doctorId,
        appointmentDateTime: when.toISOString(),
        durationMinutes: 15,
        consultationType: "IN_PERSON",
        visitType,
        reason: reason.trim() || undefined,
        symptoms: allSymptoms,
        patientName: person.name,
        patientPhone: `+91${phone}`,
        patientEmail: person.key === "self" ? person.email : undefined,
        patientAge: ageNum,
        patientGender: gender,
        bookedFor: person.key === "self" ? "SELF" : "FAMILY_MEMBER",
        relationship: person.relationship ? toBookingRelationship(person.relationship) : undefined,
      });
      Alert.alert(
        "Appointment booked",
        `${doctor.name} · ${dateTime(appt.appointmentDateTime)}${appt.tokenNumber ? `\nToken #${appt.tokenNumber}` : ""}`,
      );
      navigation.navigate("Tabs", { screen: "Bookings" });
    });
  };

  const full = availability?.available === false;
  const summary = slot ? `${day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${time12(slot)}` : null;

  return (
    <Screen
      footer={
        <Button
          title={full ? "Fully booked on this day" : summary ? `Book for ${summary}` : "Pick a time to book"}
          icon="checkmark-circle-outline"
          onPress={submit}
          loading={busy}
          disabled={full || !slot}
        />
      }
    >
      <Card>
        <H2>{doctor.name}</H2>
        <Body muted>{doctor.specialties?.join(", ")}</Body>
        <KV k="Hospital" v={hospital.hospitalName} />
        <KV k="Consultation fee" v={money(fee)} />
        <KV k="Timings" v={doctor.availability?.customTimings} />
      </Card>

      <PersonPicker
        people={people.map((p) => ({ key: p.key, name: p.name, caption: p.key === "self" ? "You" : p.relationship ? humanize(p.relationship) : undefined }))}
        value={personKey}
        onChange={setPersonKey}
        onAdd={() => navigation.navigate("FamilyMemberForm", {})}
      />

      <QuestionCard icon="calendar-outline" title="When?" subtitle="Pick a day, then a time.">
        <DayStrip days={days} value={day} onChange={(d) => { setDay(d); setSlot(null); }} />
        {availability && availability.tokenLimit != null ? (
          <Notice tone={availability.available ? "green" : "red"}>
            {availability.available ? `${availability.remainingTokens} of ${availability.tokenLimit} tokens left for this day.` : "Fully booked for this day — pick another date."}
          </Notice>
        ) : null}
        <TimeSlots slots={slots} value={slot} onChange={setSlot} />
      </QuestionCard>

      <QuestionCard icon="medkit-outline" tone="violet" title="About the visit" optional>
        <Segmented
          options={[
            { value: "NEW", label: "First visit", icon: "sparkles-outline" },
            { value: "FOLLOW_UP", label: "Follow-up", icon: "repeat-outline" },
          ]}
          value={visitType}
          onChange={setVisitType}
        />
        <MultiChips label="Symptoms" hint="Tap all that apply." options={SYMPTOMS.map((x) => ({ value: x, label: x }))} values={symptoms} onChange={setSymptoms} />
        <TextField label="Anything else?" value={otherSymptoms} onChangeText={setOtherSymptoms} placeholder="Other symptoms, comma separated" />
        <TextField label="Reason for visit" value={reason} onChangeText={setReason} placeholder="Type or pick one" suggestions={REASONS} />
      </QuestionCard>

      <QuestionCard icon="person-circle-outline" tone="green" title="Patient details" subtitle={knownAge && knownGender ? "From the profile. Change only if needed." : "The hospital needs these."}>
        {knownAge && knownGender ? (
          <Row style={{ justifyContent: "space-between" }}>
            <Body>
              {person?.name} · {age} yrs · {humanize(gender ?? "")}
            </Body>
          </Row>
        ) : (
          <>
            <TextField label="Age" required value={age} onChangeText={(t) => setAge(t.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={3} suffix="years" />
            <IconChoice label="Gender" required options={GENDER_OPTIONS} value={gender as Gender | null} onChange={setGender} />
          </>
        )}
        <PhoneField label="Contact number" required value={phone} onChange={setPhone} hint="The hospital calls this number about the appointment." />
      </QuestionCard>

      {error ? <ErrorBox message={error} /> : null}
    </Screen>
  );
}

const SYMPTOMS = ["Fever", "Cough", "Cold", "Headache", "Body pain", "Stomach pain", "Vomiting", "Breathlessness", "Chest pain", "Dizziness", "Skin rash"];
const REASONS = ["General checkup", "Review reports", "Ongoing treatment", "Second opinion"];
