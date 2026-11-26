// SOS, steps 4-6: the hospital accepts (or not) -> "Need an ambulance?" ->
// the nearest driver picks the patient up and takes them to that hospital -> pay.
// Tracking and payment themselves are on AmbulanceDetailScreen.
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { dateTime, hospitalAddress, money, statusTone } from "../../../lib/format";
import { useAction } from "../../../lib/hooks";
import { distanceKm } from "../../../lib/location";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, ErrorBox, H2, IconBox, KV, Loading, Notice, Row, Screen, Title, humanize } from "../../../ui/components";
import { OptionCards } from "../../../ui/form";
import { QuestionCard } from "../../../ui/pickers";
import { colors, font, space } from "../../../ui/theme";
import { useAmbulanceBookingsQuery, useBookEmergencyAmbulanceMutation } from "../../ambulance/api";
import { TYPE_OPTIONS } from "../../ambulance/options";
import { paymentDue, type AmbulanceBooking, type AmbulanceBookingStatus, type AmbulanceType } from "../../ambulance/types";
import { useHospitalQuery } from "../../hospital/api";
import { addressCoords } from "../../hospital/types";
import { LocationCard } from "../../location/LocationCard";
import { useCurrentLocation } from "../../location/useCurrentLocation";
import { useCancelEmergencyBookingMutation, useEmergencyConditionsQuery, useEmergencyHistoryQuery, useLinkEmergencyAmbulanceMutation, useSetEmergencyArrivalModeMutation } from "../api";
import { ambulanceDeclined, ambulanceWanted, hospitalRejected } from "../emergencySlice";
import { startPatientTracking, stopPatientTracking, trackedEmergencyId, type TrackingStart } from "../patientTracking";
import { toAmbulanceEmergencyType, type ArrivalMode, type EmergencyBooking } from "../types";

const AMB_LIVE: AmbulanceBookingStatus[] = ["SEARCHING", "EN_ROUTE_TO_PICKUP", "ARRIVED", "PICKED_UP", "PAYMENT_PENDING"];
const AMB_FAILED: AmbulanceBookingStatus[] = ["CANCELLED", "NO_AMBULANCE_FOUND"];
const AMB_TEXT: Partial<Record<AmbulanceBookingStatus, string>> = {
  SEARCHING: "Finding the nearest available driver…",
  EN_ROUTE_TO_PICKUP: "Ambulance is on the way to you.",
  ARRIVED: "Ambulance has arrived.",
  PICKED_UP: "On the way to the hospital.",
  PAYMENT_PENDING: "Ride complete. Please pay for the ambulance.",
  COMPLETED: "Ride complete and paid.",
  CANCELLED: "The ambulance was cancelled.",
  NO_AMBULANCE_FOUND: "No ambulance was free nearby. Try again, or call 108.",
};

/**
 * The emergency ambulance booked for this emergency, found from the patient's
 * ambulance bookings (so it is found again after an app restart): an
 * emergency ride booked after the alert, going to this hospital.
 */
function findLinkedAmbulance(rows: AmbulanceBooking[] | undefined, booking: EmergencyBooking, hospital: { latitude: number; longitude: number } | null) {
  // The ride the hospital already knows about, unless it ended and a newer one was booked.
  const known = booking.ambulanceBookingId ? rows?.find((r) => r.id === booking.ambulanceBookingId) : undefined;
  if (known && !AMB_FAILED.includes(known.status)) return known;
  return rows
    ?.filter((r) => r.type === "EMERGENCY" && r.createdAt >= booking.requestedAt)
    .filter((r) => !hospital || (r.drop && distanceKm(hospital, { latitude: r.drop.lat, longitude: r.drop.lng }) < 0.5))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// Paying comes before pickup: the pickup OTP is shown only once the ride is paid.
function Steps({ current }: { current: 0 | 1 | 2 | 3 | 4 }) {
  const labels = ["Hospital alerted", "Hospital accepted", "Ambulance paid", "To hospital"];
  return (
    <Row style={{ gap: 4 }}>
      {labels.map((l, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <View key={l} style={{ flex: 1, gap: 4 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: done ? colors.success : on ? colors.danger : colors.border }} />
            <Text style={{ fontSize: 10.5, fontWeight: on ? "800" : "600", color: done ? colors.success : on ? colors.danger : colors.textMuted }}>{l}</Text>
          </View>
        );
      })}
    </Row>
  );
}

export default function EmergencyStatusScreen({ navigation, route }: AppScreen<"EmergencyStatus">) {
  const { bookingId, hospitalId } = route.params;
  const dispatch = useAppDispatch();
  const declined = useAppSelector((s) => s.emergency.ambulanceDeclined.includes(bookingId));
  const loc = useCurrentLocation({ auto: true });

  // No patient GET-by-id exists: watch the booking through the history list.
  // Fast while waiting for the hospital's answer, slower once it has answered.
  const [waiting, setWaiting] = useState(true);
  const history = useEmergencyHistoryQuery(undefined, {
    pollingInterval: waiting ? 4_000 : 15_000,
    selectFromResult: (r) => ({ booking: r.data?.find((b) => b.id === bookingId), isLoading: r.isLoading, error: r.error }),
  });
  const booking = history.booking;
  const status = booking?.status;
  useEffect(() => {
    if (status) setWaiting(status === "REQUESTED");
  }, [status]);

  const { data: hospital } = useHospitalQuery(hospitalId);
  const hospitalAt = useMemo(() => addressCoords(hospital?.address), [hospital]);
  const { data: conditions } = useEmergencyConditionsQuery();
  const accepted = booking?.status === "ACCEPTED" || booking?.status === "COMPLETED";

  const ambulances = useAmbulanceBookingsQuery(undefined, { skip: !accepted, pollingInterval: accepted ? 10_000 : 0 });
  const linked = useMemo(() => (booking ? findLinkedAmbulance(ambulances.data, booking, hospitalAt) : undefined), [ambulances.data, booking, hospitalAt]);
  const ambulanceActive = linked && !AMB_FAILED.includes(linked.status);

  const [ambType, setAmbType] = useState<AmbulanceType | null>(null);
  const [bookAmbulance] = useBookEmergencyAmbulanceMutation();
  const [cancelBooking] = useCancelEmergencyBookingMutation();
  const [linkAmbulance] = useLinkEmergencyAmbulanceMutation();

  // Let the hospital follow the ambulance: tell it which ride is bringing the patient. Booking the ride
  // links it straight away; this catches up when that call failed or the app was closed in between.
  const linkTried = useRef<string | null>(null);
  const emergencyOpen = booking?.status === "REQUESTED" || booking?.status === "ACCEPTED";
  useEffect(() => {
    if (!emergencyOpen || !linked || !ambulanceActive || booking?.ambulanceBookingId === linked.id) return;
    if (linkTried.current === linked.id) return;
    linkTried.current = linked.id;
    linkAmbulance({ id: bookingId, ambulanceBookingId: linked.id }).unwrap().catch(() => undefined);
  }, [emergencyOpen, linked, ambulanceActive, booking?.ambulanceBookingId, bookingId, linkAmbulance]);
  const hospitalFollowing = !!linked && booking?.ambulanceBookingId === linked.id;
  const send = useAction();
  const act = useAction();
  const choose = useAction();

  // Coming without an Uyir ambulance (another ambulance, or on their own): the hospital follows the
  // patient's phone instead. From the server, or this phone's earlier "No" if that call never landed.
  const [setArrivalMode] = useSetEmergencyArrivalModeMutation();
  const [askAgain, setAskAgain] = useState(false);
  const selfMode: ArrivalMode | null = askAgain
    ? null
    : booking?.arrivalMode === "OTHER_AMBULANCE" || booking?.arrivalMode === "OWN_WAY"
      ? booking.arrivalMode
      : declined
        ? "OWN_WAY"
        : null;
  const shareLocation = booking?.status === "ACCEPTED" && !!selfMode && !ambulanceActive;
  const hospitalLabel = hospital?.hospitalName ?? "the hospital";
  const [sharing, setSharing] = useState<TrackingStart | null>(null);
  useEffect(() => {
    if (!booking) return;
    let stale = false;
    if (shareLocation) {
      startPatientTracking(bookingId, hospitalLabel)
        .then((r) => !stale && setSharing(r))
        .catch(() => !stale && setSharing({ started: false, worksWhenLocked: false }));
    } else {
      setSharing(null);
      // Ended, cancelled, or an Uyir ambulance took over: stop sharing this emergency's location.
      void trackedEmergencyId().then((id) => (id === bookingId ? stopPatientTracking() : undefined));
    }
    return () => {
      stale = true;
    };
    // hospitalLabel only names the notification; a change should not restart sharing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!booking, shareLocation, bookingId]);

  const chooseSelf = (mode: Exclude<ArrivalMode, "UYIR_AMBULANCE">) =>
    choose.run(async () => {
      setAskAgain(false);
      dispatch(ambulanceDeclined(bookingId));
      await setArrivalMode({ id: bookingId, mode }).unwrap();
    });

  if (history.isLoading) return <Loading label="Opening your emergency…" />;
  if (!booking) {
    return (
      <Screen>
        <ErrorBox message={history.error ? "Couldn't load this emergency." : "This emergency wasn't found."} onRetry={() => history.refetch()} />
      </Screen>
    );
  }

  const hospitalName = hospital?.hospitalName ?? "The hospital";
  const hospitalPhone = hospital?.contactDetails?.emergencyHotline || hospital?.contactDetails?.phone;

  const sendAmbulance = () =>
    send.run(async () => {
      const pickup = loc.place;
      if (!pickup) throw new Error("Set your location first, so the driver knows where to come.");
      dispatch(ambulanceWanted(bookingId));
      const amb = await bookAmbulance({
        pickup,
        drop: hospitalAt ? { lat: hospitalAt.latitude, lng: hospitalAt.longitude, address: `${hospitalName}, ${hospitalAddress(hospital?.address)}` } : undefined,
        emergencyType: toAmbulanceEmergencyType(booking.emergencyType, conditions),
        ambulanceType: ambType ?? undefined,
        contactName: booking.patientName,
        contactPhone: booking.patientPhone,
      }).unwrap();
      // Best effort: the effect above retries if this fails.
      linkTried.current = amb.id;
      linkAmbulance({ id: bookingId, ambulanceBookingId: amb.id }).unwrap().catch(() => (linkTried.current = null));
      navigation.navigate("AmbulanceDetail", { id: amb.id });
    });

  const cancel = () =>
    Alert.alert("Cancel this emergency?", `${hospitalName} will be told you are no longer coming.`, [
      { text: "Keep", style: "cancel" },
      { text: "Cancel emergency", style: "destructive", onPress: () => act.run(() => cancelBooking({ id: bookingId, reason: "Cancelled by patient" }).unwrap()) },
    ]);

  const directions = () => {
    const dest = hospitalAt ? `${hospitalAt.latitude},${hospitalAt.longitude}` : encodeURIComponent(`${hospitalName} ${hospitalAddress(hospital?.address)}`);
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
  };

  const step: 0 | 1 | 2 | 3 | 4 =
    booking.status === "REQUESTED" || !accepted ? 0
    : linked?.status === "COMPLETED" ? 4
    : ambulanceActive && linked?.paidAt ? 3
    : ambulanceActive ? 2
    : 1;
  const ambPayDue = !!linked && paymentDue(linked);

  return (
    <Screen>
      <Title>{booking.emergencyType}</Title>
      <Row style={{ gap: 8, flexWrap: "wrap" }}>
        <Badge label={booking.status} tone={statusTone(booking.status)} />
        <Body muted>{`Alerted ${dateTime(booking.requestedAt)}`}</Body>
      </Row>
      {accepted || booking.status === "REQUESTED" ? <Steps current={step} /> : null}

      <Card style={{ gap: 4 }}>
        <Row style={{ gap: 10 }}>
          <IconBox icon="business" tone="red" />
          <View style={{ flex: 1 }}>
            <H2>{hospitalName}</H2>
            <Body muted>{hospitalAddress(hospital?.address)}</Body>
          </View>
        </Row>
        {hospitalPhone ? <Button title={`Call ${hospitalPhone}`} icon="call-outline" variant="ghost" small onPress={() => Linking.openURL(`tel:${hospitalPhone}`)} /> : null}
      </Card>

      {booking.status === "REQUESTED" ? (
        <>
          <Card style={{ alignItems: "center", gap: 8, paddingVertical: space.xl }}>
            <Loading />
            <Text style={{ fontSize: font.md, fontWeight: "800", color: colors.text, textAlign: "center" }}>Waiting for {hospitalName} to accept…</Text>
            <Body muted>The emergency team has been alerted. This usually takes a minute. You can call them meanwhile.</Body>
          </Card>
          <Button title="Call 108 instead" icon="call" variant="dangerOutline" onPress={() => Linking.openURL("tel:108")} />
        </>
      ) : null}

      {booking.status === "REJECTED" ? (
        <>
          <Notice tone="red">{`${hospitalName} can't take this emergency right now.${booking.rejectionReason ? ` Reason: ${booking.rejectionReason}` : ""}`}</Notice>
          <Button
            title="Choose another hospital"
            icon="business-outline"
            variant="danger"
            onPress={() => {
              dispatch(hospitalRejected(hospitalId));
              navigation.replace("EmergencySos");
            }}
          />
          <Button title="Call 108" icon="call-outline" variant="dangerOutline" onPress={() => Linking.openURL("tel:108")} />
        </>
      ) : null}

      {booking.status === "CANCELLED" ? (
        <Notice tone="gray">{`This emergency was cancelled.${booking.cancellationReason ? ` (${booking.cancellationReason})` : ""}`}</Notice>
      ) : null}

      {accepted ? (
        <>
          <Notice tone="green">{`${hospitalName} accepted. Their emergency team is expecting ${booking.patientName}.`}</Notice>

          {linked ? (
            <Card style={{ gap: 6 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <H2>Ambulance</H2>
                <Badge label={humanize(linked.status)} tone={statusTone(linked.status)} />
              </Row>
              {AMB_TEXT[linked.status] ? <Body muted>{AMB_TEXT[linked.status]}</Body> : null}
              {hospitalFollowing && AMB_LIVE.includes(linked.status) && linked.status !== "PAYMENT_PENDING" ? (
                <Notice tone="green" icon="eye-outline">{`${hospitalName} can see your ambulance on the way and will be ready when you arrive.`}</Notice>
              ) : null}
              {ambPayDue && linked.status !== "PAYMENT_PENDING" ? (
                <Notice tone="amber">Pay for the ambulance now. Your pickup OTP appears once it's paid; the driver needs it to start the ride.</Notice>
              ) : null}
              {linked.pickupOtp ? <KV k="Pickup OTP" v={linked.pickupOtp} /> : null}
              {linked.fare != null ? <KV k="Fare" v={money(linked.fare)} /> : null}
              {!AMB_FAILED.includes(linked.status) ? (
                <Button
                  title={ambPayDue ? `Pay${linked.fare != null ? ` ${money(linked.fare)}` : ""}` : AMB_LIVE.includes(linked.status) ? "Track ambulance" : "View ride"}
                  icon={ambPayDue ? "card-outline" : "navigate-outline"}
                  variant={ambPayDue ? "success" : "primary"}
                  onPress={() => navigation.navigate("AmbulanceDetail", { id: linked.id })}
                />
              ) : null}
            </Card>
          ) : null}

          {!ambulanceActive && booking.status === "ACCEPTED" ? (
            selfMode ? (
              <Card style={{ gap: 8 }}>
                <H2>{selfMode === "OTHER_AMBULANCE" ? "Coming by another ambulance" : "Going on your own"}</H2>
                <Body muted>
                  {selfMode === "OTHER_AMBULANCE"
                    ? `Ask the ambulance crew to take you to ${hospitalName}, emergency department.`
                    : "Head straight to the emergency department and tell them you alerted them through Uyir."}
                </Body>
                {sharing?.started ? (
                  <Notice tone="green" icon="locate-outline">{`${hospitalName} can see where you are and will be ready when you arrive. Keep your phone's location on.`}</Notice>
                ) : null}
                {sharing?.started && !sharing.worksWhenLocked ? (
                  <Notice tone="amber">{`Your location stops reaching ${hospitalName} when the app is closed. In Settings, set Location to "Always".`}</Notice>
                ) : null}
                {sharing && !sharing.started ? (
                  <>
                    <Notice tone="amber">{`Allow location so ${hospitalName} can see you are on the way.`}</Notice>
                    <Button title="Open settings" icon="settings-outline" variant="secondary" small onPress={() => Linking.openSettings()} />
                  </>
                ) : null}
                <Button title="Directions to hospital" icon="navigate-outline" onPress={directions} />
                <Button
                  title="Book an Uyir ambulance instead"
                  icon="car-outline"
                  variant="dangerOutline"
                  onPress={() => {
                    setAskAgain(true);
                    dispatch(ambulanceWanted(bookingId));
                  }}
                />
              </Card>
            ) : (
              <QuestionCard icon="car-outline" tone="red" title={linked ? "Send another ambulance?" : "Do you need an ambulance?"} subtitle={`The nearest free driver picks you up and takes you to ${hospitalName}. You pay once a driver accepts; then you get the pickup OTP.`}>
                <LocationCard label="PICKUP" />
                <OptionCards label="Ambulance type (optional)" hint="Not sure? Skip it. We'll send what's nearest." options={TYPE_OPTIONS.filter((o) => o.value !== "TRANSPORT")} value={ambType} onChange={setAmbType} allowDeselect />
                {send.error ? <ErrorBox message={send.error} /> : null}
                <Button title="Yes, send an ambulance" icon="alert-circle" variant="danger" onPress={sendAmbulance} loading={send.busy} disabled={!loc.place} />
                <Button title="I've called another ambulance (108 / private)" icon="call-outline" variant="dangerOutline" onPress={() => chooseSelf("OTHER_AMBULANCE")} loading={choose.busy} />
                <Button title="No, I'll go on my own" variant="ghost" onPress={() => chooseSelf("OWN_WAY")} disabled={choose.busy} />
                {choose.error ? <ErrorBox message={choose.error} /> : null}
                <Body muted>{`Without an Uyir ambulance, your phone shares your live location with ${hospitalName} until your emergency ends.`}</Body>
              </QuestionCard>
            )
          ) : null}
        </>
      ) : null}

      {act.error ? <ErrorBox message={act.error} /> : null}
      {booking.status === "REQUESTED" || booking.status === "ACCEPTED" ? (
        <Button title="Cancel emergency" variant="ghost" small onPress={cancel} loading={act.busy} />
      ) : (
        <Button title="Back to home" variant="secondary" onPress={() => navigation.navigate("Tabs", { screen: "Home" })} />
      )}
    </Screen>
  );
}
