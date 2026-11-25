import { useCallback, useEffect, useMemo, useState } from "react";
import { labScanApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import type { LabScanAppointmentMode, PatientLab, PatientScanCenter, PatientTimeSlot } from "../../api/types";
import { useAuth } from "../../features/auth/useAuth";
import { money, nextDays, ymd } from "../../lib/format";
import { geocode, getCurrentPosition, reverseGeocode, useAction, type Coords } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Screen } from "../../ui/components";
import { DayStrip, Segmented, TimeSlots } from "../../ui/form";
import { TextField } from "../../ui/pickers";

type LabDetails = {
  lab: PatientLab;
  items: PatientLab["tests"];
  total: number;
};

type ScanDetails = {
  center: PatientScanCenter;
  items: PatientScanCenter["services"];
  total: number;
};

type BookingDetails = LabDetails | ScanDetails;

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
  const district = me?.profile?.district?.trim() || undefined;

  const [mode, setMode] = useState<LabScanAppointmentMode>(kind === "LAB" ? route.params.mode ?? "CENTER" : "CENTER");
  const [day, setDay] = useState(nextDays(14, 0)[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [address, setAddress] = useState(me?.profile.address ?? "");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [notes, setNotes] = useState("");
  const locate = useAction();
  const book = useAction();

  const [detailsData, setDetailsData] = useState<BookingDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [slotsData, setSlotsData] = useState<PatientTimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsRefreshing, setSlotsRefreshing] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const itemIdsKey = itemIds.join(",");
  const dayKey = ymd(day);

  const loadDetails = useCallback(async () => {
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      if (kind === "LAB") {
        const labs = await labScanApi.labs(district);
        const lab = labs.find((entry) => entry.labId === centerId);
        if (!lab) {
          setDetailsData(null);
          return;
        }
        const items = lab.tests.filter((test) => itemIds.includes(test.labTestId));
        if (items.length !== itemIds.length) {
          setDetailsData(null);
          return;
        }
        setDetailsData({
          lab,
          items,
          total: items.reduce((sum, item) => sum + Number(item.price ?? 0), 0),
        });
      } else {
        const centers = await labScanApi.scanCenters(district);
        const center = centers.find((entry) => entry.scanCenterId === centerId);
        if (!center) {
          setDetailsData(null);
          return;
        }
        const items = center.services.filter((service) => itemIds.includes(service.scanServiceId));
        if (items.length !== itemIds.length) {
          setDetailsData(null);
          return;
        }
        setDetailsData({
          center,
          items,
          total: items.reduce((sum, item) => sum + Number(item.price ?? 0), 0),
        });
      }
    } catch (e) {
      setDetailsError(errorMessage(e));
    } finally {
      setDetailsLoading(false);
    }
  }, [kind, centerId, district, itemIds, itemIdsKey]);

  const loadSlots = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setSlotsRefreshing(true);
      } else {
        setSlotsLoading(true);
      }
      setSlotsError(null);
      try {
        const rows = await labScanApi.timeSlots({
          ...(kind === "LAB" ? { labId: centerId } : { scanCenterId: centerId }),
          date: dayKey,
        });
        setSlotsData(rows);
      } catch (e) {
        setSlotsError(errorMessage(e));
      } finally {
        setSlotsLoading(false);
        setSlotsRefreshing(false);
      }
    },
    [kind, centerId, dayKey],
  );

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    loadSlots(false);
  }, [loadSlots]);

  useEffect(() => {
    setSelectedTime(null);
  }, [day]);

  const days = useMemo(() => nextDays(14, 0), []);
  const slotByTime = useMemo(() => {
    const map = new Map<string, PatientTimeSlot>();
    slotsData.forEach((slot) => map.set(timeLabel(slot.startTime), slot));
    return map;
  }, [slotsData]);

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
        ...(kind === "LAB"
          ? { labId: centerId, tests: itemIds.map((labTestId) => ({ labTestId })) }
          : { scanCenterId: centerId, services: itemIds.map((scanServiceId) => ({ scanServiceId })) }),
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

  if (detailsLoading) return <Loading />;
  if (detailsError || !detailsData) {
    return (
      <Screen>
        <ErrorBox message={detailsError ?? "The selected services are no longer available."} onRetry={loadDetails} />
      </Screen>
    );
  }

  const selectedNames =
    kind === "LAB"
      ? (detailsData as LabDetails).items.map((item) => item.testCatalog.name)
      : (detailsData as ScanDetails).items.map((item) => item.serviceCatalog.name);
  const summary = selectedTime
    ? `${day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${selectedTime}`
    : null;

  return (
    <Screen
      refreshing={slotsRefreshing}
      onRefresh={() => loadSlots(true)}
      footer={
        <Button
          title={summary ? `Book · ${summary}` : "Choose a time to continue"}
          icon="calendar-outline"
          onPress={submit}
          loading={book.busy}
          disabled={!selectedTime || !slotsData.length}
        />
      }
    >
      <Card>
        <H2>{centerName}</H2>
        <Body>{selectedNames.join(" · ")}</Body>
        <KV k="Appointment total" v={money(detailsData.total)} />
      </Card>

      {kind === "LAB" ? (
        <Segmented options={MODES} value={mode} onChange={setMode} />
      ) : (
        <Notice>Scan services are currently booked at the selected center.</Notice>
      )}

      <H2>Choose a date</H2>
      <DayStrip
        days={days}
        value={day}
        onChange={(value) => {
          setDay(value);
          setSelectedTime(null);
        }}
      />
      {slotsLoading ? <Loading /> : null}
      {slotsError ? <ErrorBox message={slotsError} onRetry={() => loadSlots(false)} /> : null}
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
          <Button
            title={coords ? "Location captured" : "Use my current location"}
            icon={coords ? "checkmark-circle" : "locate-outline"}
            variant={coords ? "success" : "secondary"}
            onPress={useMyLocation}
            loading={locate.busy}
          />
          {locate.error ? <ErrorBox message={locate.error} /> : null}
          <TextField
            label="Full address"
            required
            value={address}
            onChangeText={setAddress}
            placeholder="House number, street, area, district"
            multiline
          />
        </Card>
      ) : null}
      <TextField
        label="Notes for the center or collector"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional instructions"
        multiline
      />
      {book.error ? <ErrorBox message={book.error} /> : null}
      <Body muted>Booking is for the signed-in patient. Payment is available after booking.</Body>
    </Screen>
  );
}