import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { errorMessage } from "../../../services/http";
import { useAmbulanceBookingsQuery } from "../../ambulance/api";
import { useCareBookingsQuery, labScanApi } from "../../homecare/api";
import {
  useAppointmentHistoryQuery,
  useCancelAppointmentMutation,
  useCancelEmergencyBookingMutation,
  useDoctorQuery,
  useEmergencyHistoryQuery,
  useHospitalQuery,
} from "../../hospital/api";
import type { Appointment, EmergencyBooking, LabScanAppointment } from "../../hospital/types";
import { dateTime, money, statusTone } from "../../../lib/format";
import { useScreenQuery } from "../../../lib/hooks";
import { Badge, Body, Button, Card, ChipGroup, Empty, ErrorBox, H2, KV, Loading, Row, Screen, humanize } from "../../../ui/components";

type Kind = "APPOINTMENTS" | "AMBULANCE" | "HOME_CARE" | "EMERGENCY" | "LAB_SCAN" | "SAMPLE_COLLECTION";
const KINDS: Kind[] = ["APPOINTMENTS", "AMBULANCE", "HOME_CARE", "LAB_SCAN", "SAMPLE_COLLECTION", "EMERGENCY"];

const newestFirst = <T,>(rows: T[], key: (r: T) => string) => [...rows].sort((a, b) => key(b).localeCompare(key(a)));

export default function BookingsScreen() {
  const [kind, setKind] = useState<Kind>("APPOINTMENTS");
  return (
    <Screen padded>
      <ChipGroup options={KINDS} value={kind} onChange={setKind} />
      {kind === "APPOINTMENTS" ? <Appointments /> : kind === "AMBULANCE" ? <Ambulance /> : kind === "HOME_CARE" ? <HomeCare /> : kind === "LAB_SCAN" ? <LabScanBookings /> : kind === "SAMPLE_COLLECTION" ? <LabScanBookings sampleCollectionOnly /> : <Emergency />}
    </Screen>
  );
}

// Hospital and doctor names, resolved per id. RTK Query caches and de-duplicates
// these lookups, so a list of 20 bookings at one hospital makes one request.
function HospitalName({ id }: { id: string }) {
  const { data } = useHospitalQuery(id);
  return <>{data?.hospitalName ?? ""}</>;
}

function DoctorName({ id }: { id: string }) {
  const { data } = useDoctorQuery(id);
  return <>{data?.name || "Doctor"}</>;
}

function Appointments() {
  const nav = useNavigation();
  const q = useScreenQuery(useAppointmentHistoryQuery());
  const [cancelAppointment] = useCancelAppointmentMutation();
  const rows = useMemo(() => newestFirst(q.data ?? [], (r) => r.appointmentDateTime), [q.data]);
  const { error, loading, refresh } = q;
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!rows.length) return <><Empty title="No appointments yet" /><Button title="Book a doctor" onPress={() => nav.navigate("Doctors")} /></>;

  const cancel = (a: Appointment) =>
    Alert.alert("Cancel appointment?", dateTime(a.appointmentDateTime), [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelAppointment({ id: a.id, reason: "Cancelled by patient" }).unwrap();
          } catch (e) {
            Alert.alert("Could not cancel", errorMessage(e));
          }
        },
      },
    ]);

  return (
    <>
      {rows.map((a) => {
        const upcoming = ["CONFIRMED", "RESCHEDULED"].includes(a.status) && new Date(a.appointmentDateTime).getTime() > Date.now();
        return (
          <Card key={a.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <H2><DoctorName id={a.doctorId} /></H2>
              <Badge label={a.status} tone={statusTone(a.status)} />
            </Row>
            <Body muted><HospitalName id={a.hospitalId} /></Body>
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
  const q = useScreenQuery(useAmbulanceBookingsQuery());
  const data = useMemo(() => newestFirst(q.data ?? [], (r) => r.createdAt), [q.data]);
  const { error, loading, refresh } = q;
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
  const q = useScreenQuery(useCareBookingsQuery());
  const data = useMemo(() => newestFirst(q.data ?? [], (r) => r.scheduledAt), [q.data]);
  const { error, loading, refresh } = q;
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

function LabScanBookings({ sampleCollectionOnly = false }: { sampleCollectionOnly?: boolean }) {
  const nav = useNavigation();
  const { data, error, loading, refresh } = useLoad(async () => newestFirst(await labScanApi.appointments(), (a) => a.startTime));
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  const rows = (data ?? []).filter((a) => sampleCollectionOnly
    ? a.appointmentMode === "HOME" && Boolean(a.homeCollection)
    : true);
  if (!rows.length) {
    return (
      <>
        <Empty title={sampleCollectionOnly ? "No sample collection bookings" : "No Lab & Scan bookings"} />
        <Button
          title={sampleCollectionOnly ? "Book sample collection" : "Find a lab or scan center"}
          onPress={() => nav.navigate(sampleCollectionOnly ? "SampleCollection" : "LabScan")}
        />
      </>
    );
  }
  return (
    <>
      {rows.map((a: LabScanAppointment) => {
        const title = a.appointmentType === "LAB"
          ? a.tests.map((test) => test.labTest.testCatalog.name).join(", ")
          : a.services.map((service) => service.scanService.serviceCatalog.name).join(", ");
        const amount = [...a.tests, ...a.services].reduce((sum, item) => sum + Number(item.price ?? 0), 0);
        return (
          <Card key={a.appointmentId} onPress={() => nav.navigate("LabScanDetail", { id: a.appointmentId })}>
            <Row style={{ justifyContent: "space-between" }}>
              <H2>{title || (a.appointmentType === "LAB" ? "Lab tests" : "Scan")}</H2>
              <Badge label={humanize(a.status)} tone={statusTone(a.status)} />
            </Row>
            <Body muted>{a.lab?.name ?? a.scanCenter?.name}</Body>
            <KV k="When" v={dateTime(a.startTime)} />
            <KV k={a.appointmentMode === "HOME" ? "Collection" : "Visit"} v={a.appointmentMode === "HOME" ? "At home" : "At center"} />
            <KV k="Total" v={money(amount)} />
            {a.homeCollection ? <Body style={{ fontWeight: "700" }}>Sample collection · {humanize(a.homeCollection.status)}</Body> : null}
          </Card>
        );
      })}
    </>
  );
}

function Emergency() {
  const q = useScreenQuery(useEmergencyHistoryQuery());
  const [cancelEmergency] = useCancelEmergencyBookingMutation();
  const rows = useMemo(() => newestFirst(q.data ?? [], (r) => r.requestedAt), [q.data]);
  const { error, loading, refresh } = q;
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!rows.length) return <Empty title="No emergency requests" />;

  const cancel = (b: EmergencyBooking) =>
    Alert.alert("Cancel emergency request?", undefined, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelEmergency({ id: b.id, reason: "Cancelled by patient" }).unwrap();
          } catch (e) {
            Alert.alert("Could not cancel", errorMessage(e));
          }
        },
      },
    ]);

  return (
    <>
      {rows.map((b) => (
        <Card key={b.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{b.emergencyType}</H2>
            <Badge label={b.status} tone={statusTone(b.status)} />
          </Row>
          <Body muted><HospitalName id={b.hospitalId} /></Body>
          <KV k="Requested" v={dateTime(b.requestedAt)} />
          <KV k="Patient" v={b.patientName} />
          <KV k="Rejected because" v={b.rejectionReason ?? undefined} />
          {["REQUESTED", "ACCEPTED"].includes(b.status) ? <Button title="Cancel request" variant="secondary" onPress={() => cancel(b)} /> : null}
        </Card>
      ))}
    </>
  );
}
