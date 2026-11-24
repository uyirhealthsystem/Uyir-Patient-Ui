import { useEffect, useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import type { Place } from "../../../services/types";
import { useBookEmergencyAmbulanceMutation, useEstimateFareMutation, useScheduleAmbulanceMutation } from "../api";
import type { AmbulanceEmergencyType, AmbulanceType, FareEstimate } from "../types";
import { useAuth } from "../../auth/useAuth";
import { atTime, money, nextDays, TIME_SLOTS } from "../../../lib/format";
import { geocode, getCurrentPosition, reverseGeocode, useAction } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Button, Card, ErrorBox, IconBox, KV, Notice, Row, Screen, type IconName } from "../../../ui/components";
import { DayStrip, IconGrid, OptionCards, Segmented, TimeSlots, time12 } from "../../../ui/form";
import { PhoneField, QuestionCard, TextField } from "../../../ui/pickers";
import { colors, space } from "../../../ui/theme";

const EMERGENCY_OPTIONS: { value: AmbulanceEmergencyType; label: string; icon: IconName }[] = [
  { value: "CARDIAC", label: "Heart / chest pain", icon: "heart-outline" },
  { value: "ACCIDENT", label: "Accident / injury", icon: "car-outline" },
  { value: "BREATHING", label: "Breathing trouble", icon: "cloud-outline" },
  { value: "STROKE", label: "Stroke / fits", icon: "pulse-outline" },
  { value: "PREGNANCY", label: "Pregnancy", icon: "woman-outline" },
  { value: "OTHER", label: "Something else", icon: "help-circle-outline" },
];

const TYPE_OPTIONS: { value: AmbulanceType; label: string; description: string; icon: IconName }[] = [
  { value: "BLS", label: "Basic (BLS)", description: "Oxygen and first aid. Most emergencies.", icon: "medkit-outline" },
  { value: "ALS", label: "Advanced (ALS)", description: "Paramedic, cardiac monitor, life-support drugs.", icon: "pulse-outline" },
  { value: "ICU", label: "Mobile ICU", description: "Ventilator and ICU care on the way.", icon: "bed-outline" },
  { value: "TRANSPORT", label: "Patient transport", description: "Non-emergency, e.g. discharge or check-ups.", icon: "car-outline" },
];

export default function AmbulanceBookScreen({ navigation, route }: AppScreen<"AmbulanceBook">) {
  const { me } = useAuth();
  const [mode, setMode] = useState<"EMERGENCY" | "SCHEDULED">(route.params?.mode ?? "EMERGENCY");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [dropText, setDropText] = useState("");
  const [emergencyType, setEmergencyType] = useState<AmbulanceEmergencyType | null>(null);
  const [ambType, setAmbType] = useState<AmbulanceType | null>(null);
  const days = useMemo(() => nextDays(7), []);
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState(me?.profile.fullName ?? "");
  const [phone, setPhone] = useState((me?.profile.phone ?? "").replace(/\D/g, "").slice(-10));
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const locate = useAction();
  const est = useAction();
  const book = useAction();
  const [estimateFare] = useEstimateFareMutation();
  const [bookEmergency] = useBookEmergencyAmbulanceMutation();
  const [scheduleRide] = useScheduleAmbulanceMutation();
  const emergency = mode === "EMERGENCY";

  const useMyLocation = () =>
    locate.run(async () => {
      const c = await getCurrentPosition();
      const address = await reverseGeocode(c);
      setPickup({ lat: c.latitude, lng: c.longitude, address });
      setPickupText(address ?? `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`);
    });

  // In an emergency, grab the location straight away.
  useEffect(() => {
    if (emergency && !pickup) void useMyLocation();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolvePickup = async (): Promise<Place> => {
    if (pickup) return pickup;
    const c = pickupText.trim() ? await geocode(pickupText.trim()) : undefined;
    if (!c) throw new Error("Set the pickup location (use your location, or type an address we can find).");
    const p = { lat: c.latitude, lng: c.longitude, address: pickupText.trim() };
    setPickup(p);
    return p;
  };
  const resolveDrop = async (): Promise<Place | undefined> => {
    if (!dropText.trim()) return undefined;
    const c = await geocode(dropText.trim());
    if (!c) throw new Error("We couldn't find the drop address. Try a fuller address or the hospital name with city.");
    return { lat: c.latitude, lng: c.longitude, address: dropText.trim() };
  };

  const getEstimate = () =>
    est.run(async () => {
      if (!ambType) throw new Error("Choose an ambulance type.");
      const p = await resolvePickup();
      const d = await resolveDrop();
      if (!d) throw new Error("Enter a drop location to estimate the fare.");
      setEstimate(await estimateFare({ pickup: p, drop: d, ambulanceType: ambType }).unwrap());
    });

  const submit = () =>
    book.run(async () => {
      if (!name.trim()) throw new Error("Enter a contact name.");
      if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a valid 10-digit mobile number.");
      const p = await resolvePickup();
      const d = await resolveDrop();
      const contactPhone = `+91${phone}`;
      if (emergency) {
        if (!emergencyType) throw new Error("Tap what the emergency is.");
        const b = await bookEmergency({ pickup: p, drop: d, emergencyType, ambulanceType: ambType ?? undefined, contactName: name.trim(), contactPhone }).unwrap();
        navigation.replace("AmbulanceDetail", { id: b.id });
      } else {
        if (!ambType) throw new Error("Choose an ambulance type.");
        if (!d) throw new Error("A scheduled ride needs a drop location.");
        if (!slot) throw new Error("Pick a pickup time.");
        const b = await scheduleRide({ pickup: p, drop: d, ambulanceType: ambType, scheduledAt: atTime(day, slot).toISOString(), contactName: name.trim(), contactPhone }).unwrap();
        navigation.replace("AmbulanceDetail", { id: b.id });
      }
    });

  // Scheduled rides must be at least 30 minutes ahead.
  const slots = TIME_SLOTS.filter((t) => atTime(day, t).getTime() > Date.now() + 35 * 60_000);

  return (
    <Screen
      footer={
        <View style={{ gap: space.sm }}>
          <Button
            title={emergency ? "Send ambulance now" : slot ? `Book ride · ${time12(slot)}` : "Book ambulance"}
            icon={emergency ? "alert-circle" : "checkmark-circle-outline"}
            variant={emergency ? "danger" : "primary"}
            onPress={submit}
            loading={book.busy}
          />
          {emergency ? <Button title="Call 108" icon="call-outline" variant="dangerOutline" small onPress={() => Linking.openURL("tel:108")} /> : null}
        </View>
      }
    >
      <Segmented
        tone="danger"
        options={[
          { value: "EMERGENCY", label: "Emergency now", icon: "alert-circle-outline" },
          { value: "SCHEDULED", label: "Schedule ride", icon: "calendar-outline" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setEstimate(null);
        }}
      />
      {emergency ? <Notice tone="red">We'll send the nearest available ambulance. If it is life-threatening, also call 108.</Notice> : null}

      {emergency ? (
        <QuestionCard icon="alert-circle-outline" tone="red" title="What happened?" subtitle="Tap one. The crew comes prepared.">
          <IconGrid tone="danger" options={EMERGENCY_OPTIONS} value={emergencyType} onChange={setEmergencyType} />
        </QuestionCard>
      ) : null}

      <QuestionCard icon="navigate-outline" tone="green" title="Where?">
        <Card style={{ padding: 12, gap: 6, backgroundColor: pickup ? colors.successSoft : colors.bg, borderColor: pickup ? colors.success : colors.border }}>
          <Row style={{ gap: 10 }}>
            <IconBox icon={pickup ? "checkmark-circle" : "locate-outline"} tone={pickup ? "green" : "primary"} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted }}>PICKUP</Text>
              <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>
                {locate.busy ? "Finding your location…" : pickupText || "Not set yet"}
              </Text>
            </View>
          </Row>
          <Button title={pickup ? "Refresh my location" : "Use my current location"} icon="locate-outline" variant="outline" small onPress={useMyLocation} loading={locate.busy} />
        </Card>
        {locate.error ? <ErrorBox message={locate.error} /> : null}
        <TextField
          label="Or type the pickup address"
          icon="pin-outline"
          value={pickup ? "" : pickupText}
          onChangeText={(t) => {
            setPickupText(t);
            setPickup(null);
          }}
          placeholder="House no., street, area, city"
        />
        <TextField
          label={emergency ? "Hospital to go to" : "Drop address"}
          required={!emergency}
          hint={emergency ? "Optional. Leave empty and the crew takes you to the nearest suitable hospital." : undefined}
          icon="business-outline"
          value={dropText}
          onChangeText={(t) => {
            setDropText(t);
            setEstimate(null);
          }}
          placeholder="e.g. Govt. General Hospital, Chennai"
        />
      </QuestionCard>

      {!emergency ? (
        <QuestionCard icon="calendar-outline" title="Pickup time" subtitle="At least 30 minutes from now.">
          <DayStrip days={days} value={day} onChange={(d) => { setDay(d); setSlot(null); }} />
          <TimeSlots slots={slots} value={slot} onChange={setSlot} />
        </QuestionCard>
      ) : null}

      <QuestionCard icon="medkit-outline" tone="violet" title="Ambulance type" subtitle={emergency ? "Not sure? Skip it. We'll send what's nearest." : undefined} optional={emergency}>
        <OptionCards options={TYPE_OPTIONS} value={ambType} onChange={(t) => { setAmbType(t); setEstimate(null); }} allowDeselect />
        {ambType && dropText.trim() && !estimate ? <Button title="Estimate fare" icon="calculator-outline" variant="secondary" onPress={getEstimate} loading={est.busy} /> : null}
        {est.error ? <ErrorBox message={est.error} /> : null}
        {estimate ? (
          <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
            <KV k="Distance" v={`${estimate.distanceKm.toFixed(1)} km`} />
            <KV k="Travel time" v={`~${estimate.durationMin} min`} />
            <KV k="Estimated fare" v={money(estimate.fare, estimate.currency)} />
          </Card>
        ) : null}
      </QuestionCard>

      <QuestionCard icon="call-outline" tone="amber" title="Who should the crew call?">
        <TextField label="Contact name" required icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" />
        <PhoneField required value={phone} onChange={setPhone} />
      </QuestionCard>

      {book.error ? <ErrorBox message={book.error} /> : null}
    </Screen>
  );
}
