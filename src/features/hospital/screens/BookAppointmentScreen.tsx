import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useFamilyQuery } from "../../profile/api";
import { useAvailabilityQuery, useBookAppointmentMutation, useDoctorQuery, useHospitalQuery } from "../api";
import type { Gender } from "../../profile/types";
import { useAuth } from "../../auth/useAuth";
import { atTime, dateTime, money, nextDays, ymd } from "../../../lib/format";
import { useAction, useScreenQuery } from "../../../lib/hooks";
import { peopleFrom, toBookingRelationship } from "../../../lib/people";
import type { AppScreen } from "../../../navigation/types";
import { Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Row, Screen, humanize } from "../../../ui/components";
import { DayStrip, MultiChips, PersonPicker, Segmented } from "../../../ui/form";
import { DateField, GENDER_OPTIONS, IconChoice, PhoneField, QuestionCard, TextField } from "../../../ui/pickers";

export default function BookAppointmentScreen({ navigation, route }: AppScreen<"BookAppointment">) {
  const { hospitalId, doctorId } = route.params;
  const { me } = useAuth();
  const hospitalQ = useScreenQuery(useHospitalQuery(hospitalId));
  const doctorQ = useScreenQuery(useDoctorQuery(doctorId));
  // Family is optional here: if it fails, the patient can still book for themselves.
  const { data: family } = useFamilyQuery();
  const ctx = {
    loading: hospitalQ.loading || doctorQ.loading,
    error: hospitalQ.error ?? doctorQ.error,
    refresh: () => Promise.all([hospitalQ.refresh(), doctorQ.refresh()]),
    data: hospitalQ.data && doctorQ.data ? { hospital: hospitalQ.data, doctor: doctorQ.data } : null,
  };

  const people = useMemo(() => peopleFrom(me, family), [me, family]);
  const days = useMemo(() => nextDays(14), []);
  const [personKey, setPersonKey] = useState("self");
  const [day, setDay] = useState(days[0]);
  // The strip shows the next 14 days; the calendar reaches 3 months out. A date
  // picked from the calendar joins the strip so the choice stays visible.
  const lastBookableDay = useMemo(() => nextDays(1, 90)[0], []);
  const inStrip = days.some((d) => d.getTime() === day.getTime());
  const stripDays = useMemo(() => (inStrip ? days : [...days, day]), [days, day, inStrip]);
  const [visitType, setVisitType] = useState<"NEW" | "FOLLOW_UP">("NEW");
  const [reason, setReason] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [otherSymptoms, setOtherSymptoms] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  // Daily token limit for this doctor, if the hospital set one.
  const { currentData: availability } = useAvailabilityQuery({ hospitalId, doctorId, date: ymd(day) });
  const { busy, error, setError, run } = useAction();
  const [bookAppointment] = useBookAppointmentMutation();

  const person = people.find((p) => p.key === personKey);
  useEffect(() => {
    if (!person) return;
    setPhone(person.phone.replace(/D/g, "").slice(-10));
    setAge(person.age != null ? String(person.age) : "");
    setGender(person.gender);
  }, [person?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ctx.loading) return <Loading />;
  if (ctx.error || !ctx.data) return <Screen><ErrorBox message={ctx.error ?? "Not found"} onRetry={ctx.refresh} /></Screen>;
  const { hospital, doctor } = ctx.data;
  const fee = doctor.hospitalAssociations?.find((a) => a.hospitalId === hospitalId)?.consultationFee ?? doctor.consultationFee;
  const knownAge = person?.age != null;
  const knownGender = !!person?.gender;

  const submit = () => {
    if (!person) return setError("Choose who the appointment is for.");
    const ageNum = Number(age);
    if (!age || !Number.isInteger(ageNum) || ageNum < 0 || ageNum > 130) return setError("Enter the patient's age.");
    if (!gender) return setError("Choose the patient's gender.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    // Token booking: the patient picks only the day. The API still needs a time,
    // so send when the doctor's day starts (or now, if that has passed today).
    const when = new Date(Math.max(atTime(day, startOfDay(doctor.availability?.customTimings)).getTime(), Date.now() + 60_000));
    const allSymptoms = [...symptoms, ...otherSymptoms.split(",").map((x) => x.trim()).filter(Boolean)];
    run(async () => {
      const appt = await bookAppointment({
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
      }).unwrap();
      Alert.alert(
        "Appointment booked",
        `${doctor.name} · ${dateTime(appt.appointmentDateTime)}${appt.tokenNumber ? `\nToken #${appt.tokenNumber}` : ""}`,
      );
      navigation.navigate("Tabs", { screen: "Bookings" });
    });
  };

  const full = availability?.available === false;
  const summary = day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <Screen
      footer={
        <Button
          title={full ? "Fully booked on this day" : `Book for ${summary}`}
          icon="checkmark-circle-outline"
          onPress={submit}
          loading={busy}
          disabled={full}
        />
      }
    >
      <Card>
        <H2>{doctor.name}</H2>
        <Body muted>{doctor.specialties?.join(", ")}</Body>
        <KV k="Hospital" v={hospital.hospitalName} />
        <KV k="Consultation fee" v={money(fee)} />
      </Card>

      <PersonPicker
        people={people.map((p) => ({ key: p.key, name: p.name, caption: p.key === "self" ? "You" : p.relationship ? humanize(p.relationship) : undefined }))}
        value={personKey}
        onChange={setPersonKey}
        onAdd={() => navigation.navigate("FamilyMemberForm", {})}
      />

      <QuestionCard icon="calendar-outline" title="Which day?" subtitle="Pick a day, or choose any date in the calendar. You get a token number for that day.">
        <DayStrip days={stripDays} value={day} onChange={setDay} />
        <DateField
          label="Or choose another date"
          value={inStrip ? "" : ymd(day)}
          onChange={(iso) => {
            if (!iso) return;
            const [y, m, d] = iso.split("-").map(Number);
            setDay(new Date(y, m - 1, d));
          }}
          minDate={days[0]}
          maxDate={lastBookableDay}
          placeholder="Open calendar"
        />
        {availability && availability.tokenLimit != null ? (
          <Notice tone={availability.available ? "green" : "red"}>
            {availability.available ? `${availability.remainingTokens} of ${availability.tokenLimit} tokens left for this day.` : "Fully booked for this day — pick another date."}
          </Notice>
        ) : null}
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

/** "Mon-Fri 10am-1pm" -> "10:00"; "9:30 AM - 5 PM" -> "09:30". Falls back to 09:00. */
function startOfDay(timings?: string): string {
  const m = timings?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return "09:00";
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "pm") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

const SYMPTOMS = ["Fever", "Cough", "Cold", "Headache", "Body pain", "Stomach pain", "Vomiting", "Breathlessness", "Chest pain", "Dizziness", "Skin rash"];
const REASONS = ["General checkup", "Review reports", "Ongoing treatment", "Second opinion"];
