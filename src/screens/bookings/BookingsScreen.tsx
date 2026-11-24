import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Alert } from "react-native";
import { errorMessage } from "../../api/client";
import { ambulanceApi, homeCareApi, hospitalApi } from "../../api/endpoints";
import type { AmbulanceBooking, Appointment, CareBooking, EmergencyBooking } from "../../api/types";
import { dateTime, money, statusTone } from "../../lib/format";
import { useLoad } from "../../lib/hooks";
import { Badge, Body, Button, Card, ChipGroup, Empty, ErrorBox, H2, KV, Loading, Row, Screen, humanize } from "../../ui/components";

type Kind = "APPOINTMENTS" | "AMBULANCE" | "HOME_CARE" | "EMERGENCY";
const KINDS: Kind[] = ["APPOINTMENTS", "AMBULANCE", "HOME_CARE", "EMERGENCY"];

const newestFirst = <T,>(rows: T[], key: (r: T) => string) => [...rows].sort((a, b) => key(b).localeCompare(key(a)));

export default function BookingsScreen() {
  const [kind, setKind] = useState<Kind>("APPOINTMENTS");
  return (
    <Screen padded>
      <ChipGroup options={KINDS} value={kind} onChange={setKind} />
      {kind === "APPOINTMENTS" ? <Appointments /> : kind === "AMBULANCE" ? <Ambulance /> : kind === "HOME_CARE" ? <HomeCare /> : <Emergency />}
    </Screen>
  );
}

function useNames() {
  // Resolve hospital/doctor ids to names, cached for the session.
  const cache = useState(() => new Map<string, string>())[0];
  return async (ids: { hospitalId: string; doctorId?: string }[]) => {
    const want = new Set<string>();
    ids.forEach((i) => {
      if (!cache.has(`h:${i.hospitalId}`)) want.add(`h:${i.hospitalId}`);
      if (i.doctorId && !cache.has(`d:${i.doctorId}`)) want.add(`d:${i.doctorId}`);
    });
    await Promise.all(
      [...want].map(async (k) => {
        try {
          const id = k.slice(2);
          cache.set(k, k.startsWith("h:") ? (await hospitalApi.byId(id)).hospitalName : (await hospitalApi.doctor(id)).name);
        } catch {
          cache.set(k, "");
        }
      }),
    );
    return cache;
  };
}

function Appointments() {
  const nav = useNavigation();
  const names = useNames();
  const { data, error, loading, refresh, reload } = useLoad(async () => {
    const rows = newestFirst(await hospitalApi.appointmentHistory(), (r) => r.appointmentDateTime);
    return { rows, names: await names(rows) };
  });
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data?.rows.length) return <><Empty title="No appointments yet" /><Button title="Book a doctor" onPress={() => nav.navigate("Doctors")} /></>;

  const cancel = (a: Appointment) =>
    Alert.alert("Cancel appointment?", dateTime(a.appointmentDateTime), [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await hospitalApi.cancelAppointment(a.id, "Cancelled by patient");
            reload();
          } catch (e) {
            Alert.alert("Could not cancel", errorMessage(e));
          }
        },
      },
    ]);

  return (
    <>
      {data.rows.map((a) => {
        const upcoming = ["CONFIRMED", "RESCHEDULED"].includes(a.status) && new Date(a.appointmentDateTime).getTime() > Date.now();
        return (
          <Card key={a.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <H2>{data.names.get(`d:${a.doctorId}`) || "Doctor"}</H2>
              <Badge label={a.status} tone={statusTone(a.status)} />
            </Row>
            <Body muted>{data.names.get(`h:${a.hospitalId}`)}</Body>
            <KV k="When" v={dateTime(a.appointmentDateTime)} />
            <KV k="Token" v={a.tokenNumber ? `#${a.tokenNumber}` : undefined} />
            <KV k="Patient" v={`${a.patientName}${a.bookedFor === "FAMILY_MEMBER" ? " (family)" : ""}`} />
            <KV k="Visit" v={humanize(a.visitType)} />
            <KV k="Reason" v={a.reason ?? undefined} />
            <KV k="Cancellation" v={a.cancellationReason ?? undefined} />
            {upcoming ? <Button title="Cancel appointment" variant="secondary" onPress={() => cancel(a)} /> : null}
          </Card>
        );
      })}
    </>
  );
}

function Ambulance() {
  const nav = useNavigation();
  const { data, error, loading, refresh } = useLoad(async () => newestFirst(await ambulanceApi.list(), (r: AmbulanceBooking) => r.createdAt));
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data?.length) return <><Empty title="No ambulance bookings" /><Button title="Book an ambulance" onPress={() => nav.navigate("AmbulanceBook")} /></>;
  return (
    <>
      {data.map((b) => (
        <Card key={b.id} onPress={() => nav.navigate("AmbulanceDetail", { id: b.id })}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{b.type === "EMERGENCY" ? `Emergency · ${humanize(b.emergencyType ?? "OTHER")}` : "Scheduled ride"}</H2>
            <Badge label={b.status} tone={statusTone(b.status)} />
          </Row>
          <KV k="Pickup" v={b.pickup.address} />
          <KV k={b.scheduledAt ? "Scheduled" : "Booked"} v={dateTime(b.scheduledAt ?? b.createdAt)} />
          <KV k="Fare" v={b.fare != null ? money(b.fare) : undefined} />
        </Card>
      ))}
    </>
  );
}

function HomeCare() {
  const nav = useNavigation();
  const { data, error, loading, refresh } = useLoad(async () => newestFirst(await homeCareApi.list(), (r: CareBooking) => r.scheduledAt));
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data?.length) return <><Empty title="No home care bookings" /><Button title="Book home care" onPress={() => nav.navigate("HomeCare")} /></>;
  return (
    <>
      {data.map((b) => (
        <Card key={b.id} onPress={() => nav.navigate("HomeCareDetail", { id: b.id })}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{b.service.name}</H2>
            <Badge label={b.status} tone={statusTone(b.status)} />
          </Row>
          <KV k="When" v={dateTime(b.scheduledAt)} />
          <KV k="Amount" v={money(b.amount)} />
          {b.status === "CONFIRMED" ? <Body style={{ fontWeight: "600" }}>Payment due — tap to pay</Body> : null}
        </Card>
      ))}
    </>
  );
}

function Emergency() {
  const names = useNames();
  const { data, error, loading, refresh, reload } = useLoad(async () => {
    const rows = newestFirst(await hospitalApi.emergencyHistory(), (r: EmergencyBooking) => r.requestedAt);
    return { rows, names: await names(rows) };
  });
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data?.rows.length) return <Empty title="No emergency requests" />;

  const cancel = (b: EmergencyBooking) =>
    Alert.alert("Cancel emergency request?", undefined, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          try {
            await hospitalApi.cancelEmergencyBooking(b.id, "Cancelled by patient");
            reload();
          } catch (e) {
            Alert.alert("Could not cancel", errorMessage(e));
          }
        },
      },
    ]);

  return (
    <>
      {data.rows.map((b) => (
        <Card key={b.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{b.emergencyType}</H2>
            <Badge label={b.status} tone={statusTone(b.status)} />
          </Row>
          <Body muted>{data.names.get(`h:${b.hospitalId}`)}</Body>
          <KV k="Requested" v={dateTime(b.requestedAt)} />
          <KV k="Patient" v={b.patientName} />
          <KV k="Rejected because" v={b.rejectionReason ?? undefined} />
          {["REQUESTED", "ACCEPTED"].includes(b.status) ? <Button title="Cancel request" variant="secondary" onPress={() => cancel(b)} /> : null}
        </Card>
      ))}
    </>
  );
}
