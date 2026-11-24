import { useEffect, useMemo, useState } from "react";
import { labScanApi } from "../../api/endpoints";
import type { LabScanAppointmentMode, PatientLab, PatientScanCenter, PatientTimeSlot } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { atTime, money, nextDays, ymd } from "../../lib/format";
import { geocode, getCurrentPosition, reverseGeocode, useAction, useLoad, type Coords } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Screen } from "../../ui/components";
import { DayStrip, Segmented, TimeSlots } from "../../ui/form";
import { TextField } from "../../ui/pickers";

const MODES = [
  { value: "CENTER" as const, label: "At center", icon: "business-outline" as const },
  { value: "HOME" as const, label: "Home collection", icon: "home-outline" as const },
];

const timeLabel = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export default function LabScanBookingScreen({ navigation, route }: AppScreen<"LabScanBooking">) {
  const { kind, centerId, centerName, itemIds } = route.params;
  const { me } = useAuth();
  const [mode, setMode] = useState<LabScanAppointmentMode>(kind === "LAB" ? route.params.mode ?? "CENTER" : "CENTER");
  const [day, setDay] = useState(nextDays(14, 0)[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [address, setAddress] = useState(me?.profile.address ?? "");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [notes, setNotes] = useState("");
  const locate = useAction();
  const book = useAction();

  const details = useLoad(async () => {
    if (kind === "LAB") {
      const labs = await labScanApi.labs();
      const lab = labs.find((entry) => entry.labId === centerId);
      if (!lab) return null;
      const items = lab.tests.filter((test) => itemIds.includes(test.labTestId));
      if (items.length !== itemIds.length) return null;
      return { lab, items, total: items.reduce((sum, item) => sum + Number(item.price ?? 0), 0) };
    }
    const centers = await labScanApi.scanCenters();
    const center = centers.find((entry) => entry.scanCenterId === centerId);
    if (!center) return null;
    const items = center.services.filter((service) => itemIds.includes(service.scanServiceId));
    if (items.length !== itemIds.length) return null;
    return { center, items, total: items.reduce((sum, item) => sum + Number(item.price ?? 0), 0) };
  }, [kind, centerId, itemIds.join(",")]);

  const slots = useLoad(
    () =>
      labScanApi.timeSlots({
        ...(kind === "LAB" ? { labId: centerId } : { scanCenterId: centerId }),
        date: ymd(day),
      }),
    [kind, centerId, ymd(day)],
  );
  const days = useMemo(() => nextDays(14, 0), []);
  const slotByTime = useMemo(() => {
    const map = new Map<string, PatientTimeSlot>();
    (slots.data ?? []).forEach((slot) => map.set(timeLabel(slot.startTime), slot));
    return map;
  }, [slots.data]);

  useEffect(() => setSelectedTime(null), [day]);

  const useMyLocation = () =>
    locate.run(async () => {
      const current = await getCurrentPosition();
      setCoords(current);
      const currentAddress = await reverseGeocode(current);
      if (currentAddress && !address.trim()) setAddress(currentAddress);
    });

  const submit = () =>
    book.run(async () => {
      const slot = selectedTime ? slotByTime.get(selectedTime) : undefined;
      if (!slot) throw new Error("Choose an available appointment time.");
      let location: Coords | null = null;
      if (mode === "HOME") {
        if (address.trim().length < 5) throw new Error("Enter the full sample collection address.");
        location = coords ?? (await geocode(address.trim())) ?? null;
        if (!location) throw new Error("We couldn't locate that address. Use your current location or enter a more specific address.");
      }

      const booking = await labScanApi.createAppointment({
        ...(kind === "LAB" ? { labId: centerId, tests: itemIds.map((labTestId) => ({ labTestId })) } : { scanCenterId: centerId, services: itemIds.map((scanServiceId) => ({ scanServiceId })) }),
        appointmentType: kind,
        appointmentMode: mode,
        appointmentDate: ymd(day),
        startTime: slot.startTime,
        endTime: slot.endTime,
        ...(mode === "HOME"
          ? {
              address: address.trim(),
              latitude: location!.latitude,
              longitude: location!.longitude,
              specialInstructions: notes.trim() || undefined,
            }
          : {}),
        patientNotes: notes.trim() || undefined,
      });
      navigation.replace("LabScanDetail", { id: booking.appointmentId });
    });

  if (details.loading) return <Loading />;
  if (details.error || !details.data) return <Screen><ErrorBox message={details.error ?? "The selected services are no longer available."} onRetry={details.refresh} /></Screen>;

  const selectedItems = details.data.items;
  const selectedNames = selectedItems.map((item) => kind === "LAB" ? (item as PatientLab["tests"][number]).testCatalog.name : (item as PatientScanCenter["services"][number]).serviceCatalog.name);
  const summary = selectedTime ? `${day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${selectedTime}` : null;

  return (
    <Screen
      refreshing={slots.refreshing}
      onRefresh={slots.refresh}
      footer={<Button title={summary ? `Book · ${summary}` : "Choose a time to continue"} icon="calendar-outline" onPress={submit} loading={book.busy} disabled={!selectedTime || !slots.data?.length} />}
    >
      <Card>
        <H2>{centerName}</H2>
        <Body>{selectedNames.join(" · ")}</Body>
        <KV k="Appointment total" v={money(details.data.total)} />
      </Card>

      {kind === "LAB" ? (
        <Segmented
          options={MODES}
          value={mode}
          onChange={setMode}
        />
      ) : (
        <Notice>Scan services are currently booked at the selected center.</Notice>
      )}

      <H2>Choose a date</H2>
      <DayStrip days={days} value={day} onChange={(value) => { setDay(value); setSelectedTime(null); }} />
      {slots.loading ? <Loading /> : null}
      {slots.error ? <ErrorBox message={slots.error} onRetry={slots.refresh} /> : null}
      <TimeSlots
        slots={[...slotByTime.keys()]}
        value={selectedTime}
        onChange={setSelectedTime}
        emptyText="No bookable time slots for this date. Choose another date."
      />

      {mode === "HOME" ? (
        <Card>
          <H2>Sample collection address</H2>
          <Body muted>The collector needs your location to be assigned and find you.</Body>
          <Button title={coords ? "Location captured" : "Use my current location"} icon={coords ? "checkmark-circle" : "locate-outline"} variant={coords ? "success" : "secondary"} onPress={useMyLocation} loading={locate.busy} />
          {locate.error ? <ErrorBox message={locate.error} /> : null}
          <TextField label="Full address" required value={address} onChangeText={setAddress} placeholder="House number, street, area, district" multiline />
        </Card>
      ) : null}
      <TextField label="Notes for the center or collector" value={notes} onChangeText={setNotes} placeholder="Optional instructions" multiline />
      {book.error ? <ErrorBox message={book.error} /> : null}
      <Body muted>Booking is for the signed-in patient. Payment is available after booking.</Body>
    </Screen>
  );
}
