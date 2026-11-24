import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import { useRefreshPaymentMutation } from "../../payments/api";
import { useCancelAmbulanceMutation, usePayAmbulanceMutation, useTrackAmbulanceQuery } from "../api";
import type { AmbulanceBookingStatus } from "../types";
import { dateTime, money, statusTone } from "../../../lib/format";
import { useAction, useScreenQuery } from "../../../lib/hooks";
import { openCheckout } from "../../payments/checkout";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Screen, Title, humanize } from "../../../ui/components";
import { colors } from "../../../ui/theme";
import { Text } from "react-native";

const LIVE: AmbulanceBookingStatus[] = ["SEARCHING", "EN_ROUTE_TO_PICKUP", "ARRIVED", "PICKED_UP"];
const CANCELLABLE: AmbulanceBookingStatus[] = ["SCHEDULED", "SEARCHING", "EN_ROUTE_TO_PICKUP", "ARRIVED"];

const STATUS_TEXT: Partial<Record<AmbulanceBookingStatus, string>> = {
  SCHEDULED: "Your ride is scheduled. We'll find a driver before pickup time.",
  SEARCHING: "Finding the nearest available ambulance…",
  EN_ROUTE_TO_PICKUP: "Ambulance is on the way to you.",
  ARRIVED: "Ambulance has arrived. Share the OTP with the driver.",
  PICKED_UP: "On the way to the destination.",
  PAYMENT_PENDING: "Ride complete. Please pay for the ride.",
  COMPLETED: "Ride complete and paid. Take care!",
  CANCELLED: "This booking was cancelled.",
  NO_AMBULANCE_FOUND: "Sorry — no ambulance was available. Please call 108.",
};

export default function AmbulanceDetailScreen({ route }: AppScreen<"AmbulanceDetail">) {
  const { id } = route.params;
  // Poll every 5 s while the ride is live. Cancel and pay invalidate the
  // booking, so it also refetches by itself after those.
  const [live, setLive] = useState(false);
  const { data, error, loading, refreshing, refresh } = useScreenQuery(useTrackAmbulanceQuery(id, { pollingInterval: live ? 5000 : 0 }));
  const act = useAction();
  const [cancelRide] = useCancelAmbulanceMutation();
  const [payRide] = usePayAmbulanceMutation();
  const [refreshPayment] = useRefreshPaymentMutation();
  const status = data?.booking.status;
  useEffect(() => setLive(!!status && LIVE.includes(status)), [status]);

  if (loading) return <Loading />;
  if (error || !data) return <Screen><ErrorBox message={error ?? "Not found"} onRetry={refresh} /></Screen>;
  const { booking: b, driver, eta } = data;

  const cancel = () =>
    Alert.alert("Cancel ambulance?", "The driver will be released.", [
      { text: "Keep", style: "cancel" },
      { text: "Cancel booking", style: "destructive", onPress: () => act.run(() => cancelRide(id).unwrap()) },
    ]);

  const pay = () =>
    act.run(async () => {
      const p = await payRide(id).unwrap();
      if (p.status === "PAID") return;
      if (!p.checkoutUrl) throw new Error("Payment could not be started. Please try again.");
      await openCheckout(p.checkoutUrl);
      await refreshPayment(p.paymentId).unwrap().catch(() => undefined);
      await refresh();
    });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>{b.type === "EMERGENCY" ? `Emergency · ${humanize(b.emergencyType ?? "OTHER")}` : "Scheduled ride"}</Title>
      <Badge label={b.status} tone={statusTone(b.status)} />
      {STATUS_TEXT[b.status] ? <Notice tone={statusTone(b.status)}>{STATUS_TEXT[b.status]}</Notice> : null}

      {b.pickupOtp ? (
        <Card style={{ alignItems: "center" }}>
          <Body muted>Pickup OTP — give this to the driver</Body>
          <Text style={{ fontSize: 36, fontWeight: "800", letterSpacing: 8, color: colors.primary }}>{b.pickupOtp}</Text>
        </Card>
      ) : null}

      {driver ? (
        <Card>
          <H2>{driver.name}</H2>
          <KV k="Vehicle" v={driver.plateNumber} />
          <KV k="Type" v={humanize(driver.ambulanceType)} />
          {eta ? <KV k="ETA" v={`${eta.minutes} min · ${eta.distanceKm.toFixed(1)} km`} /> : null}
          <Button title="Call driver" icon="call-outline" variant="secondary" onPress={() => Linking.openURL(`tel:${driver.phone}`)} />
        </Card>
      ) : null}

      <Card>
        <KV k="Pickup" v={b.pickup.address ?? `${b.pickup.lat.toFixed(4)}, ${b.pickup.lng.toFixed(4)}`} />
        <KV k="Drop" v={b.drop ? b.drop.address ?? `${b.drop.lat.toFixed(4)}, ${b.drop.lng.toFixed(4)}` : undefined} />
        <KV k="Ambulance" v={b.ambulanceType ? humanize(b.ambulanceType) : "Nearest available"} />
        <KV k="Scheduled for" v={b.scheduledAt ? dateTime(b.scheduledAt) : undefined} />
        <KV k="Contact" v={`${b.contactName} · ${b.contactPhone}`} />
        <KV k="Fare" v={b.fare != null ? money(b.fare) : undefined} />
        <KV k="Paid" v={b.paidAt ? dateTime(b.paidAt) : undefined} />
        <KV k="Booked" v={dateTime(b.createdAt)} />
      </Card>

      {act.error ? <ErrorBox message={act.error} /> : null}
      {b.status === "PAYMENT_PENDING" ? <Button title={`Pay ${b.fare != null ? money(b.fare) : ""}`} onPress={pay} loading={act.busy} /> : null}
      {CANCELLABLE.includes(b.status) ? <Button title="Cancel booking" variant="secondary" onPress={cancel} loading={act.busy} /> : null}
      {b.status === "NO_AMBULANCE_FOUND" ? <Button title="Call 108" icon="call" variant="danger" onPress={() => Linking.openURL("tel:108")} /> : null}
    </Screen>
  );
}
