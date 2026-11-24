import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { homeCareApi, usersApi } from "../../api/endpoints";
import type { Prescription } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { atTime, money, nextDays, TIME_SLOTS } from "../../lib/format";
import { geocode, getCurrentPosition, reverseGeocode, useAction, useLoad, type Coords } from "../../lib/hooks";
import { peopleFrom } from "../../lib/people";
import { DISTRICT_OPTIONS } from "../../lib/places";
import type { AppScreen } from "../../navigation/types";
import { Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Row, Screen, humanize } from "../../ui/components";
import { DayStrip, PersonPicker, TimeSlots, time12 } from "../../ui/form";
import { PhoneField, QuestionCard, SelectField, TextField } from "../../ui/pickers";
import { space } from "../../ui/theme";

const DOSAGES = ["1 tablet", "250 mg", "500 mg", "5 ml"];
const FREQUENCIES = ["Once a day", "Twice a day", "3 times a day", "At bedtime"];
const DURATIONS = ["3 days", "5 days", "7 days", "1 month"];

export default function HomeCareBookScreen({ navigation, route }: AppScreen<"HomeCareBook">) {
  const { serviceId } = route.params;
  const { me } = useAuth();
  const ctx = useLoad(async () => {
    const [services, family] = await Promise.all([homeCareApi.services(), usersApi.family.list().catch(() => [])]);
    return { service: services.find((s) => s.id === serviceId) ?? null, family };
  }, [serviceId]);

  const people = useMemo(() => peopleFrom(me, ctx.data?.family), [me, ctx.data]);
  const days = useMemo(() => nextDays(14, 1), []);
  const [personKey, setPersonKey] = useState("self");
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(me?.profile.address ?? "");
  const [city, setCity] = useState(me?.profile.district ?? "");
  const [pincode, setPincode] = useState(me?.profile.pinCode ?? "");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [notes, setNotes] = useState("");
  const [rx, setRx] = useState<Prescription[]>([]);
  const locate = useAction();
  const book = useAction();

  const person = people.find((p) => p.key === personKey);
  useEffect(() => {
    if (person) {
      setName(person.name);
      setPhone(person.phone.replace(/\D/g, "").slice(-10));
    }
  }, [person?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = () =>
    locate.run(async () => {
      const c = await getCurrentPosition();
      setCoords(c);
      const a = await reverseGeocode(c);
      if (a && !address.trim()) setAddress(a);
    });

  if (ctx.loading) return <Loading />;
  if (ctx.error || !ctx.data) return <Screen><ErrorBox message={ctx.error ?? "Not found"} onRetry={ctx.refresh} /></Screen>;
  const service = ctx.data.service;
  if (!service) return <Screen><ErrorBox message="This service is no longer available." /></Screen>;

  const setRxField = (i: number, k: keyof Prescription, v: string) => setRx(rx.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const submit = () =>
    book.run(async () => {
      if (name.trim().length < 2) throw new Error("Enter the patient's name.");
      if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a valid 10-digit mobile number.");
      if (!slot) throw new Error("Pick a visit time.");
      if (address.trim().length < 5) throw new Error("Enter the full visit address.");
      if (city.trim().length < 2) throw new Error("Choose the city or district.");
      if (!/^[1-9]\d{5}$/.test(pincode.trim())) throw new Error("Enter the 6-digit PIN code.");
      // Providers are matched by distance, so a location is required.
      const c = coords ?? (await geocode(`${address.trim()}, ${city.trim()} ${pincode.trim()}`));
      if (!c) throw new Error("We couldn't locate that address. Tap 'Use my current location' if you are at the visit address.");
      const b = await homeCareApi.create({
        serviceId,
        scheduledAt: atTime(day, slot).toISOString(),
        patientName: name.trim(),
        patientPhone: `+91${phone}`,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        latitude: c.latitude,
        longitude: c.longitude,
        notes: notes.trim() || undefined,
        prescriptions: rx.filter((r) => r.medicineName.trim()).map((r) => ({
          medicineName: r.medicineName.trim(),
          dosage: r.dosage?.trim() || undefined,
          frequency: r.frequency?.trim() || undefined,
          duration: r.duration?.trim() || undefined,
        })),
      });
      navigation.replace("HomeCareDetail", { id: b.id });
    });

  const summary = slot ? `${day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${time12(slot)}` : null;

  return (
    <Screen footer={<Button title={summary ? `Request visit · ${summary}` : "Pick a time to continue"} icon="home-outline" onPress={submit} loading={book.busy} disabled={!slot} />}>
      <Card>
        <H2>{service.name}</H2>
        <Row style={{ gap: space.lg }}>
          <KV k="Duration" v={`${service.durationMinutes} min`} />
          <KV k="Price" v={money(service.price)} />
        </Row>
      </Card>

      <PersonPicker
        label="Who needs care?"
        people={people.map((p) => ({ key: p.key, name: p.name, caption: p.key === "self" ? "You" : p.relationship ? humanize(p.relationship) : undefined }))}
        value={personKey}
        onChange={setPersonKey}
        onAdd={() => navigation.navigate("FamilyMemberForm", {})}
      />

      <QuestionCard icon="calendar-outline" title="When should they come?" subtitle="Visits can be booked from tomorrow.">
        <DayStrip days={days} value={day} onChange={setDay} />
        <TimeSlots slots={TIME_SLOTS} value={slot} onChange={setSlot} />
      </QuestionCard>

      <QuestionCard icon="location-outline" tone="green" title="Visit address" subtitle="Where the nurse or caregiver should come.">
        <Button
          title={coords ? "Location captured" : "Use my current location"}
          icon={coords ? "checkmark-circle" : "locate-outline"}
          variant={coords ? "success" : "secondary"}
          onPress={useMyLocation}
          loading={locate.busy}
        />
        {locate.error ? <ErrorBox message={locate.error} /> : null}
        <TextField label="Address" required icon="home-outline" value={address} onChangeText={setAddress} placeholder="House no., street, area" multiline />
        <SelectField label="City / district" required icon="business-outline" value={city} onChange={setCity} options={DISTRICT_OPTIONS} placeholder="Choose district" searchPlaceholder="Search districts" allowOther />
        <TextField label="PIN code" required icon="keypad-outline" value={pincode} onChangeText={(t) => setPincode(t.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} placeholder="600001" />
      </QuestionCard>

      <QuestionCard icon="person-circle-outline" tone="violet" title="Patient contact">
        <TextField label="Patient name" required icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" />
        <PhoneField required value={phone} onChange={setPhone} hint="The provider calls this number before the visit." />
        <TextField label="Notes for the provider" value={notes} onChangeText={setNotes} placeholder="Type or pick one" suggestions={["Ring the bell", "Call when you arrive", "Patient is bedridden", "Lift not available"]} />
      </QuestionCard>

      <QuestionCard icon="medical-outline" tone="amber" title="Medicines to give" subtitle="Only if the provider should give medicines." optional>
        {rx.map((r, i) => (
          <View key={i} style={{ gap: space.md, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Body style={{ fontWeight: "800" }}>Medicine {i + 1}</Body>
              <Button title="Remove" icon="trash-outline" variant="ghost" small onPress={() => setRx(rx.filter((_, j) => j !== i))} />
            </Row>
            <TextField label="Medicine name" icon="medkit-outline" value={r.medicineName} onChangeText={(v) => setRxField(i, "medicineName", v)} placeholder="e.g. Paracetamol" />
            <TextField label="Dose" value={r.dosage ?? ""} onChangeText={(v) => setRxField(i, "dosage", v)} placeholder="Type or pick" suggestions={DOSAGES} />
            <TextField label="How often" value={r.frequency ?? ""} onChangeText={(v) => setRxField(i, "frequency", v)} placeholder="Type or pick" suggestions={FREQUENCIES} />
            <TextField label="For how long" value={r.duration ?? ""} onChangeText={(v) => setRxField(i, "duration", v)} placeholder="Type or pick" suggestions={DURATIONS} />
          </View>
        ))}
        {rx.length < 20 ? <Button title={rx.length ? "Add another medicine" : "Add a medicine"} icon="add-circle-outline" variant="outline" onPress={() => setRx([...rx, { medicineName: "" }])} /> : null}
      </QuestionCard>

      <Notice>You won't pay now. Once a provider accepts and confirms, you'll be asked to pay in the app.</Notice>
      {book.error ? <ErrorBox message={book.error} /> : null}
    </Screen>
  );
}
