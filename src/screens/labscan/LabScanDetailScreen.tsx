import { useCallback, useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import { labScanApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import type { LabScanAppointment } from "../../api/types";
import { useAction } from "../../lib/hooks";
import { money, dateTime, statusTone } from "../../lib/format";
import { openCheckout } from "../../features/payments/checkout";
import type { AppScreen } from "../../navigation/types";
import { Badge, Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Screen, Title, humanize } from "../../ui/components";

export default function LabScanDetailScreen({ navigation, route }: AppScreen<"LabScanDetail">) {
  const { id } = route.params;
  const [booking, setBooking] = useState<LabScanAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = useAction();
  const [resultsOpened, setResultsOpened] = useState(false);

  const fetchBooking = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await labScanApi.appointment(id);
        setBooking(res);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchBooking(false);
  }, [fetchBooking]);

  const refresh = () => fetchBooking(true);
  const reload = () => fetchBooking(false);

  if (loading) return <Loading />;
  if (error || !booking) return <Screen><ErrorBox message={error ?? "Booking not found"} onRetry={refresh} /></Screen>;

  const payment = booking.payments?.[0];
  const paid = booking.payments?.some((item) => item.status === "PAID") ?? false;
  const canPay = !paid && booking.status !== "CANCELLED";
  const items =
    booking.appointmentType === "LAB"
      ? (booking.tests ?? []).map((test) => ({
          id: test.appointmentTestId,
          name: test.labTest?.testCatalog?.name ?? "Lab test",
          price: test.price,
        }))
      : (booking.services ?? []).map((service) => ({
          id: service.appointmentServiceId,
          name: service.scanService?.serviceCatalog?.name ?? "Scan",
          price: service.price,
        }));

  const startPayment = () =>
    pay.run(async () => {
      const created = await labScanApi.createPaymentLink(id);
      setBooking({
        ...booking,
        payments: [created, ...(booking.payments ?? []).filter((item) => item.paymentId !== created.paymentId)],
      });
      if (created.status !== "PAID" && created.checkoutUrl) {
        await openCheckout(created.checkoutUrl);
      }
      await reload();
    });

  const callCenter = async (phone?: string | null) => {
    if (!phone) return;
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (e) {
      Alert.alert("Could not start call", errorMessage(e));
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>{booking.bookingId}</Title>
      <Badge label={humanize(booking.status)} tone={statusTone(booking.status)} />
      <Card>
        <H2>{booking.lab?.name ?? booking.scanCenter?.name ?? "Provider"}</H2>
        <KV k="Type" v={booking.appointmentType === "LAB" ? "Lab tests" : "Scan"} />
        <KV k="Mode" v={booking.appointmentMode === "HOME" ? "Home sample collection" : "At center"} />
        <KV k="When" v={dateTime(booking.startTime)} />
        <KV
          k="Address"
          v={
            booking.appointmentMode === "HOME"
              ? booking.address ?? undefined
              : booking.lab?.address ?? booking.scanCenter?.address ?? undefined
          }
        />
        {booking.lab?.phone || booking.scanCenter?.phone ? (
          <Button
            title="Call center"
            icon="call-outline"
            variant="secondary"
            onPress={() => callCenter(booking.lab?.phone ?? booking.scanCenter?.phone)}
          />
        ) : null}
      </Card>

      <Card>
        <H2>{booking.appointmentType === "LAB" ? "Tests" : "Scans"}</H2>
        {items.map((item) => (
          <KV key={item.id} k={item.name} v={money(item.price)} />
        ))}
        {booking.patientNotes ? <KV k="Notes" v={booking.patientNotes} /> : null}
      </Card>

      {booking.homeCollection ? (
        <Card>
          <H2>Sample collection</H2>
          <Notice tone={statusTone(booking.homeCollection.status)}>{humanize(booking.homeCollection.status)}</Notice>
          <KV k="Address" v={booking.homeCollection.address ?? booking.address ?? undefined} />
          <Button
            title="Track sample collector"
            icon="navigate-outline"
            onPress={() => navigation.navigate("SampleCollectorTracking", { id: booking.homeCollection!.homeCollectionId })}
          />
        </Card>
      ) : null}

      <Card>
        <H2>Payment</H2>
        <KV
          k="Amount"
          v={
            payment
              ? money(payment.amount, payment.currency)
              : money(items.reduce((sum, item) => sum + Number(item.price ?? 0), 0))
          }
        />
        <KV k="Status" v={payment ? humanize(payment.status) : "Not paid"} />
        {payment?.paidAt ? <KV k="Paid" v={dateTime(payment.paidAt)} /> : null}
        {canPay ? (
          <Button
            title={payment?.status === "CREATED" ? "Continue to payment" : "Pay online"}
            icon="card-outline"
            onPress={startPayment}
            loading={pay.busy}
          />
        ) : null}
        {pay.error ? <ErrorBox message={pay.error} /> : null}
        {paid ? <Notice tone="green">Payment received.</Notice> : null}
      </Card>

      <Card>
        <H2>Results</H2>
        <Body muted>Reports are shown here when the center uploads them.</Body>
        <Button
          title={resultsOpened ? "Refresh results" : "View results"}
          icon="document-text-outline"
          variant="secondary"
          onPress={() => {
            setResultsOpened(true);
            navigation.navigate("LabScanResults", { id });
          }}
        />
      </Card>
    </Screen>
  );
}