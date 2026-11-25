// One ambulance ride: live status, payment, the pickup OTP, the driver.
//
// Pay before pickup: once a driver accepts, the fare is fixed and the patient
// pays. Only then does the ambulance service reveal the pickup OTP, and the
// driver can't start the ride without it. Rides from before prepayment still
// pay after the drop (PAYMENT_PENDING).
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Text, View } from "react-native";
import { dateTime, money, statusTone } from "../../../lib/format";
import { useAction, useScreenQuery } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, ErrorBox, H2, IconBox, KV, Loading, Notice, Row, Screen, Title, humanize } from "../../../ui/components";
import { colors, font } from "../../../ui/theme";
import { useRefreshPaymentMutation } from "../../payments/api";
import { openCheckout } from "../../payments/checkout";
import { useCancelAmbulanceMutation, usePayAmbulanceMutation, useTrackAmbulanceQuery } from "../api";
import { PAY_BEFORE_PICKUP, paymentDue, type AmbulanceBookingStatus } from "../types";

const LIVE: AmbulanceBookingStatus[] = ["SEARCHING", "EN_ROUTE_TO_PICKUP", "ARRIVED", "PICKED_UP"];
const CANCELLABLE: AmbulanceBookingStatus[] = ["SCHEDULED", "SEARCHING", "EN_ROUTE_TO_PICKUP", "ARRIVED"];

const STATUS_TEXT: Partial<Record<AmbulanceBookingStatus, string>> = {
  SCHEDULED: "Your ride is scheduled. We'll find a driver before pickup time.",
  SEARCHING: "Finding the nearest available ambulance…",
  EN_ROUTE_TO_PICKUP: "Ambulance is on the way to you.",
  ARRIVED: "Ambulance has arrived.",
  PICKED_UP: "On the way to the destination.",
  PAYMENT_PENDING: "Ride complete. Please pay for the ride.",
  COMPLETED: "Ride complete and paid. Take care!",
  CANCELLED: "This booking was cancelled.",
  NO_AMBULANCE_FOUND: "Sorry — no ambulance was available. Please call 108.",
};

export default function AmbulanceDetailScreen({ route }: AppScreen<"AmbulanceDetail">) {
  const { id } = route.params;
  // Back from the checkout, waiting for the payment service to confirm (it tells
  // the ambulance service within seconds): poll fast meanwhile.
  const [confirming, setConfirming] = useState(false);
  const [live, setLive] = useState(false);
  const { data, error, loading, refreshing, refresh } = useScreenQuery(
    useTrackAmbulanceQuery(id, { pollingInterval: confirming ? 2000 : live ? 5000 : 0 }),
  );
  const act = useAction();
  const [cancelRide] = useCancelAmbulanceMutation();
  const [payRide] = usePayAmbulanceMutation();
  const [refreshPayment] = useRefreshPaymentMutation();
  const status = data?.booking.status;
  const paid = !!data?.booking.paidAt;
  useEffect(() => setLive(!!status && LIVE.includes(status)), [status]);

  // Stop "confirming" once the payment shows up, or after a minute (the patient can pay again then).
  useEffect(() => {
    if (!confirming) return;
    if (paid || status === "COMPLETED") return setConfirming(false);
    const t = setTimeout(() => setConfirming(false), 60_000);
    return () => clearTimeout(t);
  }, [confirming, paid, status]);

  if (loading) return <Loading />;
  if (error || !data) return <Screen><ErrorBox message={error ?? "Not found"} onRetry={refresh} /></Screen>;
  const { booking: b, driver, eta } = data;
  const due = paymentDue(b);
  const beforePickup = PAY_BEFORE_PICKUP.includes(b.status);

  const cancel = () =>
    Alert.alert(
      "Cancel ambulance?",
      b.paidAt ? "The driver will be released. Your payment will be refunded by Uyir." : "The driver will be released.",
      [
        { text: "Keep", style: "cancel" },
        { text: "Cancel booking", style: "destructive", onPress: () => act.run(() => cancelRide(id).unwrap()) },
      ],
    );

  const pay = () =>
    act.run(async () => {
      const p = await payRide(id).unwrap();
      if (p.status === "PAID") return void (await refresh());
      if (!p.checkoutUrl) throw new Error("Payment could not be started. Please try again.");
      await openCheckout(p.checkoutUrl);
      // Ask the payment service to check with Razorpay now, then wait for the confirmation.
      await refreshPayment(p.paymentId).unwrap().catch(() => undefined);
      setConfirming(true);
      await refresh();
    });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>{b.type === "EMERGENCY" ? `Emergency · ${humanize(b.emergencyType ?? "OTHER")}` : "Scheduled ride"}</Title>
      <Badge label={humanize(b.status)} tone={statusTone(b.status)} />
      {STATUS_TEXT[b.status] ? <Notice tone={statusTone(b.status)}>{STATUS_TEXT[b.status]}</Notice> : null}

      {/* Pay first: the OTP appears once the payment is confirmed. */}
      {due ? (
        <Card style={{ gap: 10, borderColor: colors.warning, backgroundColor: colors.warningSoft }}>
          <Row style={{ gap: 10 }}>
            <IconBox icon="card-outline" tone="amber" />
            <View style={{ flex: 1 }}>
              <H2>{beforePickup ? "Pay to get your pickup OTP" : "Pay for your ride"}</H2>
              <Body muted>
                {beforePickup
                  ? "The driver needs your OTP to start the ride. You'll see it here as soon as the payment is confirmed."
                  : "Your ride is complete."}
              </Body>
            </View>
          </Row>
          {b.fare != null ? <Text style={{ fontSize: font.xxl, fontWeight: "800", color: colors.text }}>{money(b.fare)}</Text> : null}
          {confirming ? (
            <Row style={{ gap: 8 }}>
              <ActivityIndicator color={colors.warning} />
              <Body muted>Confirming your payment…</Body>
            </Row>
          ) : (
            <Button title={`Pay${b.fare != null ? ` ${money(b.fare)}` : ""}`} icon="card-outline" variant="success" onPress={pay} loading={act.busy} />
          )}
        </Card>
      ) : null}

      {b.pickupOtp ? (
        <Card style={{ alignItems: "center", borderColor: colors.success }}>
          <Body muted>Paid ✓ · Pickup OTP — give this to the driver</Body>
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
        <KV k={b.driverId ? "Fare" : "Estimated fare"} v={b.fare != null ? money(b.fare) : undefined} />
        <KV k="Paid" v={b.paidAt ? dateTime(b.paidAt) : undefined} />
        <KV k="Booked" v={dateTime(b.createdAt)} />
      </Card>
      {b.status === "SEARCHING" ? <Body muted>You'll pay once a driver accepts. The fare is fixed then.</Body> : null}
      {b.status === "CANCELLED" && b.paidAt ? <Notice tone="amber">This ride was paid and then cancelled. Uyir will refund the payment.</Notice> : null}

      {act.error ? <ErrorBox message={act.error} /> : null}
      {CANCELLABLE.includes(b.status) ? <Button title="Cancel booking" variant="secondary" onPress={cancel} loading={act.busy} /> : null}
      {b.status === "NO_AMBULANCE_FOUND" ? <Button title="Call 108" icon="call" variant="danger" onPress={() => Linking.openURL("tel:108")} /> : null}
    </Screen>
  );
}
