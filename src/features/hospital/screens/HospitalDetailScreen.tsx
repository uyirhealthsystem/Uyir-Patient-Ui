import { Linking } from "react-native";
import { useHospitalQuery, useSearchDoctorsQuery } from "../api";
import { hospitalAddress, money } from "../../../lib/format";
import { useScreenQuery } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, Empty, ErrorBox, H2, KV, Loading, Row, Screen, Title } from "../../../ui/components";

export default function HospitalDetailScreen({ navigation, route }: AppScreen<"HospitalDetail">) {
  const { id } = route.params;
  const hospital = useScreenQuery(useHospitalQuery(id));
  const doctorsQ = useScreenQuery(useSearchDoctorsQuery({ hospitalId: id }));
  const loading = hospital.loading || doctorsQ.loading;
  const error = hospital.error ?? doctorsQ.error;
  const refreshing = hospital.refreshing || doctorsQ.refreshing;
  const refresh = () => Promise.all([hospital.refresh(), doctorsQ.refresh()]);
  const data = hospital.data && doctorsQ.data ? { hospital: hospital.data, doctors: doctorsQ.data.content } : null;

  if (loading) return <Loading />;
  if (error || !data) return <Screen><ErrorBox message={error ?? "Not found"} onRetry={refresh} /></Screen>;
  const { hospital: h, doctors } = data;
  const phone = h.contactDetails?.emergencyHotline || h.contactDetails?.phone;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>{h.hospitalName}</Title>
      <Body muted>{hospitalAddress(h.address)}</Body>
      <Row style={{ flexWrap: "wrap" }}>
        <Badge label={h.hospitalType} tone="blue" />
        {h.emergencyServices?.handlesEmergencies ? <Badge label="Emergency" tone="red" /> : null}
        {h.emergencyServices?.ambulance24x7Available ? <Badge label="24x7 Ambulance" tone="amber" /> : null}
      </Row>

      <Card>
        <KV k="Phone" v={h.contactDetails?.phone} />
        <KV k="Emergency hotline" v={h.contactDetails?.emergencyHotline} />
        <KV k="Email" v={h.contactDetails?.email} />
        <KV k="District" v={h.address?.district} />
        {h.facilities?.specialtyDepartments?.length ? <KV k="Departments" v={h.facilities.specialtyDepartments.join(", ")} /> : null}
      </Card>
      {phone ? <Button title={`Call ${phone}`} icon="call-outline" variant="secondary" onPress={() => Linking.openURL(`tel:${phone}`)} /> : null}

      <H2>Doctors</H2>
      {doctors.length === 0 ? <Empty title="No doctors listed yet" /> : null}
      {doctors.map((d) => {
        const assoc = d.hospitalAssociations?.find((a) => a.hospitalId === id);
        return (
          <Card key={d.id}>
            <H2>{d.name}</H2>
            <Body muted>{[d.specialties?.join(", "), d.qualifications?.join(", ")].filter(Boolean).join(" · ")}</Body>
            <KV k="Experience" v={d.yearsOfExperience != null ? `${d.yearsOfExperience} yrs` : undefined} />
            <KV k="Consultation fee" v={money(assoc?.consultationFee ?? d.consultationFee)} />
            <KV k="Timings" v={d.availability?.customTimings} />
            <Button title="Book appointment" onPress={() => navigation.navigate("BookAppointment", { hospitalId: id, doctorId: d.id })} />
          </Card>
        );
      })}
    </Screen>
  );
}
