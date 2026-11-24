import { useState } from "react";
import { Alert, Linking, Text } from "react-native";
import { useCancelCareBookingMutation, useCareBookingQuery, usePayCareBookingMutation } from "../api";
import type { CareBookingStatus } from "../types";
import { dateTime, money, statusTone } from "../../../lib/format";
import { useAction, useScreenQuery } from "../../../lib/hooks";
import { openCheckout } from "../../payments/checkout";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Screen, Title, humanize } from "../../../ui/components";
import { TextField } from "../../../ui/pickers";
import { colors } from "../../../ui/theme";

const STATUS_TEXT: Record<CareBookingStatus, string> = {
  PENDING: "Waiting for a provider near you to accept.",
  ACCEPTED: "A provider accepted. They'll call you to confirm the details.",
  CONFIRMED: "Confirmed by the provider. Please pay to lock in the visit.",
  PAID: "Paid. Share the visit OTP with the provider when they arrive.",
  IN_PROGRESS: "Visit in progress.",
  COMPLETED: "Visit completed. Take care!",
  CANCELLED: "This booking was cancelled.",
};
const CANCELLABLE: CareBookingStatus[] = ["PENDING", "ACCEPTED", "CONFIRMED"];

export default function HomeCareDetailScreen({ route }: AppScreen<"HomeCareDetail">) {
  const { id } = route.params;
  // Pay and cancel invalidate the booking, so it refetches by itself afterwards.
  const { data: b, error, loading, refreshing, refresh } = useScreenQuery(useCareBookingQuery(id));
  const [payBooking] = usePayCareBookingMutation();
  const [cancelBooking] = useCancelCareBookingMutation();
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const act = useAction();

  if (loading) return <Loading />;
  if (error || !b) return <Screen><ErrorBox message={error ?? "Not found"} onRetry={refresh} /></Screen>;

  const pay = () =>
    act.run(async () => {
      const r = await payBooking(id).unwrap();
      if (r.payment.status === "PAID" || !r.payment.checkoutUrl) return;
      await openCheckout(r.payment.checkoutUrl);
      await refresh();
    });

  const cancel = () =>
    Alert.alert("Cancel this visit?", undefined, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel visit",
        style: "destructive",
        onPress: () =>
          act.run(async () => {
            await cancelBooking({ id, reason: reason.trim() || undefined }).unwrap();
            setCancelling(false);
          }),
      },
    ]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>{b.service.name}</Title>
      <Badge label={b.status} tone={statusTone(b.status)} />
      <Notice tone={statusTone(b.status)}>{STATUS_TEXT[b.status]}</Notice>

      {b.visitOtp ? (
        <Card style={{ alignItems: "center" }}>
          <Body muted>Visit OTP — give this to the provider</Body>
          <Text style={{ fontSize: 36, fontWeight: "800", letterSpacing: 8, color: colors.primary }}>{b.visitOtp}</Text>
        </Card>
      ) : null}

      {b.provider ? (
        <Card>
          <H2>{b.provider.fullName}</H2>
          <Body muted>{humanize(b.careType)}</Body>
          <Button title="Call provider" icon="call-outline" variant="secondary" onPress={() => Linking.openURL(`tel:${b.provider!.phone}`)} />
        </Card>
      ) : null}

      <Card>
        <KV k="When" v={dateTime(b.scheduledAt)} />
        <KV k="Duration" v={`${b.service.durationMinutes} min`} />
        <KV k="Amount" v={money(b.amount)} />
        <KV k="Patient" v={b.patient ? `${b.patient.fullName} · ${b.patient.phone}` : undefined} />
        <KV k="Address" v={b.address ? `${b.address}, ${b.city} ${b.pincode}` : `${b.city} ${b.pincode}`} />
        <KV k="Notes" v={b.notes ?? undefined} />
        <KV k="Payment" v={b.payment ? humanize(b.payment.status) : undefined} />
        <KV k="Cancel reason" v={b.cancelReason ?? undefined} />
      </Card>
      {b.payment?.failureReason ? <Notice tone="red">Last payment failed: {b.payment.failureReason}</Notice> : null}
      {b.payment?.refundRequired ? <Notice tone="amber">You paid for this cancelled visit. A refund will be processed.</Notice> : null}

      {b.prescriptions?.length ? (
        <Card>
          <H2>Prescriptions</H2>
          {b.prescriptions.map((p) => (
            <Body key={p.id}>• {[p.medicineName, p.dosage, p.frequency, p.duration].filter(Boolean).join(" · ")}</Body>
          ))}
        </Card>
      ) : null}

      {act.error ? <ErrorBox message={act.error} /> : null}
      {b.status === "CONFIRMED" ? <Button title={`Pay ${money(b.amount)}`} onPress={pay} loading={act.busy} /> : null}
      {CANCELLABLE.includes(b.status) ? (
        cancelling ? (
          <>
            <TextField
              label="Why are you cancelling?"
              value={reason}
              onChangeText={setReason}
              placeholder="Optional — type or pick one"
              suggestions={["Change of plans", "Booked by mistake", "Patient is better", "Found another provider"]}
            />
            <Button title="Confirm cancellation" variant="danger" onPress={cancel} loading={act.busy} />
            <Button title="Keep booking" variant="ghost" onPress={() => setCancelling(false)} />
          </>
        ) : (
          <Button title="Cancel visit" variant="secondary" onPress={() => setCancelling(true)} />
        )
      ) : null}
    </Screen>
  );
}
