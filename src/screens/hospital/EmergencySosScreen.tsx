import { useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { hospitalApi } from "../../api/endpoints";
import type { EmergencyBooking, EmergencyCondition, EmergencyHospitalSuggestion } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { hospitalAddress, statusTone } from "../../lib/format";
import { getCurrentPosition, useAction, useLoad } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Badge, Body, Button, Card, Empty, ErrorBox, H2, KV, Loading, Notice, Screen } from "../../ui/components";
import { PhoneField, QuestionCard, TextField } from "../../ui/pickers";
import { colors, font, radius, space } from "../../ui/theme";

export default function EmergencySosScreen({ navigation }: AppScreen<"EmergencySos">) {
  const { me } = useAuth();
  const conditions = useLoad(() => hospitalApi.emergencyConditions(), [], { onFocus: false });
  const [condition, setCondition] = useState<EmergencyCondition | null>(null);
  const [hospitals, setHospitals] = useState<EmergencyHospitalSuggestion[] | null>(null);
  const [km, setKm] = useState(10);
  const [name, setName] = useState(me?.profile.fullName ?? "");
  const [phone, setPhone] = useState((me?.profile.phone ?? "").replace(/\D/g, "").slice(-10));
  const [booking, setBooking] = useState<EmergencyBooking | null>(null);
  const find = useAction();
  const book = useAction();

  const search = (c: EmergencyCondition, kmArg = km) =>
    find.run(async () => {
      setCondition(c);
      const pos = await getCurrentPosition();
      setHospitals(await hospitalApi.emergencySos(c.code, pos.latitude, pos.longitude, kmArg));
    });

  const request = (h: EmergencyHospitalSuggestion) => {
    if (!name.trim() || !/^[6-9]\d{9}$/.test(phone)) return book.setError("Enter the patient's name and a valid 10-digit mobile number.");
    book.run(async () => {
      setBooking(
        await hospitalApi.createEmergencyBooking({
          hospitalId: h.hospitalId,
          emergencyType: condition!.code,
          patientName: name.trim(),
          patientPhone: `+91${phone}`,
        }),
      );
    });
  };

  if (booking) {
    return (
      <Screen>
        <Notice tone="green">The hospital has been alerted. Keep your phone close — they may call you.</Notice>
        <Card>
          <H2>{booking.emergencyType}</H2>
          <Badge label={booking.status} tone={statusTone(booking.status)} />
          <KV k="Patient" v={booking.patientName} />
          <KV k="Phone" v={booking.patientPhone} />
        </Card>
        <Button title="Also send an ambulance" icon="car-outline" variant="danger" onPress={() => navigation.navigate("AmbulanceBook", { mode: "EMERGENCY" })} />
        <Button title="See my bookings" variant="secondary" onPress={() => navigation.navigate("Tabs", { screen: "Bookings" })} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Notice tone="red">Life-threatening? Call 108 immediately.</Notice>
      <Button title="Call 108" icon="call" variant="danger" onPress={() => Linking.openURL("tel:108")} />

      <H2>What is the emergency?</H2>
      {conditions.loading ? <Loading /> : null}
      {conditions.error ? <ErrorBox message={conditions.error} onRetry={conditions.refresh} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {conditions.data?.map((c) => {
          const on = condition?.code === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => search(c)}
              style={{
                width: "48%",
                padding: space.md,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: on ? colors.danger : colors.border,
                backgroundColor: on ? colors.dangerSoft : colors.white,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 22 }}>{c.icon}</Text>
              <Text style={{ fontSize: font.sm, fontWeight: "600", color: colors.text }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {find.busy ? <Loading label="Finding hospitals ready for this…" /> : null}
      {find.error ? <ErrorBox message={find.error} /> : null}

      {hospitals && condition && !find.busy ? (
        <>
          <H2>Hospitals within {km} km</H2>
          <QuestionCard icon="call-outline" tone="red" title="Who should the hospital call?">
            <TextField label="Patient name" required icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" />
            <PhoneField label="Contact number" required value={phone} onChange={setPhone} />
          </QuestionCard>
          {book.error ? <ErrorBox message={book.error} /> : null}
          {hospitals.length === 0 ? (
            <>
              <Empty title="No hospital nearby can take this right now" subtitle="Widen the search, or call 108." />
              {km < 50 ? (
                <Button
                  title={`Search within ${km * 2} km`}
                  variant="secondary"
                  onPress={() => {
                    setKm(km * 2);
                    search(condition, km * 2);
                  }}
                />
              ) : null}
            </>
          ) : null}
          {hospitals.map((h) => (
            <Card key={h.hospitalId}>
              <H2>{h.hospitalName}</H2>
              <Body muted>{hospitalAddress(h.address)}</Body>
              <KV k="Doctors on duty" v={String(h.availableDoctorCount)} />
              {h.availableSpecialties?.length ? <KV k="Specialities" v={h.availableSpecialties.join(", ")} /> : null}
              <Button
                title="Alert this hospital"
                variant="danger"
                loading={book.busy}
                onPress={() =>
                  Alert.alert("Alert hospital?", `${h.hospitalName} will be told you are coming with: ${condition.name}`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Alert", style: "destructive", onPress: () => request(h) },
                  ])
                }
              />
              {h.contactDetails?.phone ? (
                <Button title={h.contactDetails.emergencyHotline || h.contactDetails.phone} icon="call-outline" variant="ghost" onPress={() => Linking.openURL(`tel:${h.contactDetails.emergencyHotline || h.contactDetails.phone}`)} />
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
