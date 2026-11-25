// SOS, step 1-3: where are you -> what is the emergency -> which nearby hospital to alert.
// Steps 4-6 (hospital accepts, ambulance, pay) are on EmergencyStatusScreen.
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { errorMessage } from "../../../services/http";
import { hospitalAddress } from "../../../lib/format";
import { useAction, useScreenQuery } from "../../../lib/hooks";
import { distanceKm } from "../../../lib/location";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, Empty, ErrorBox, H2, KV, Loading, Notice, Row, Screen } from "../../../ui/components";
import { PhoneField, QuestionCard, TextField } from "../../../ui/pickers";
import { colors, font, radius, space } from "../../../ui/theme";
import { useAuth } from "../../auth/useAuth";
import { addressCoords } from "../../hospital/types";
import { LocationCard } from "../../location/LocationCard";
import { useCurrentLocation } from "../../location/useCurrentLocation";
import { useCreateEmergencyBookingMutation, useEmergencyConditionsQuery, useLazyEmergencySosQuery } from "../api";
import { ActiveEmergencyBanner } from "../components/ActiveEmergencyBanner";
import { conditionChosen } from "../emergencySlice";
import type { EmergencyHospitalSuggestion } from "../types";

const RADII = [10, 20, 40];

export default function EmergencySosScreen({ navigation }: AppScreen<"EmergencySos">) {
  const dispatch = useAppDispatch();
  const { me } = useAuth();
  const loc = useCurrentLocation({ auto: true });
  const condition = useAppSelector((s) => s.emergency.condition);
  const rejected = useAppSelector((s) => s.emergency.rejectedHospitalIds);
  const conditions = useScreenQuery(useEmergencyConditionsQuery(), { onFocus: false });
  const [radiusIdx, setRadiusIdx] = useState(0);
  const km = RADII[radiusIdx];
  const [findHospitals, sos] = useLazyEmergencySosQuery();
  const [name, setName] = useState(me?.profile.fullName ?? "");
  const [phone, setPhone] = useState((me?.profile.phone ?? "").replace(/\D/g, "").slice(-10));
  const [createBooking] = useCreateEmergencyBookingMutation();
  const book = useAction();
  const [alerting, setAlerting] = useState<string | null>(null);

  // Search as soon as both the place and the emergency are known (and again if either changes).
  const place = loc.place;
  useEffect(() => {
    if (condition && place) void findHospitals({ emergencyType: condition.code, latitude: place.lat, longitude: place.lng, radiusKm: km });
  }, [condition?.code, place?.lat, place?.lng, km, findHospitals]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nearest first, without hospitals that already turned this emergency down.
  const hospitals = useMemo(() => {
    if (!sos.currentData || !place) return null;
    const here = { latitude: place.lat, longitude: place.lng };
    return sos.currentData
      .filter((h) => !rejected.includes(h.hospitalId))
      .map((h) => {
        const c = addressCoords(h.address);
        return { ...h, km: c ? distanceKm(here, c) : null };
      })
      .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
  }, [sos.currentData, place, rejected]);

  const alertHospital = (h: EmergencyHospitalSuggestion) => {
    if (name.trim().length < 2) return book.setError("Enter the patient's name, so the hospital knows who is coming.");
    if (!/^[6-9]\d{9}$/.test(phone)) return book.setError("Enter a valid 10-digit mobile number the hospital can call.");
    Alert.alert("Alert this hospital?", `${h.hospitalName} will be told ${name.trim()} is coming with: ${condition!.name}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Alert hospital",
        style: "destructive",
        onPress: () => {
          setAlerting(h.hospitalId);
          void book
            .run(async () => {
              const b = await createBooking({
                hospitalId: h.hospitalId,
                emergencyType: condition!.code,
                patientName: name.trim(),
                patientPhone: `+91${phone}`,
              }).unwrap();
              navigation.replace("EmergencyStatus", { bookingId: b.id, hospitalId: h.hospitalId });
            })
            .finally(() => setAlerting(null));
        },
      },
    ]);
  };

  return (
    <Screen>
      <ActiveEmergencyBanner />
      <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerLine, gap: 8 }}>
        <Text style={{ fontSize: font.md, fontWeight: "800", color: colors.danger }}>Life-threatening? Call 108 now.</Text>
        <Body muted>Then use this screen to alert a nearby hospital and send an ambulance.</Body>
        <Button title="Call 108" icon="call" variant="danger" small onPress={() => Linking.openURL("tel:108")} />
      </Card>

      <QuestionCard icon="navigate-outline" tone="green" title="1. Where are you?" subtitle="Hospitals and the ambulance are found from here.">
        <LocationCard label="YOUR LOCATION" />
      </QuestionCard>

      <QuestionCard icon="alert-circle-outline" tone="red" title="2. What is the emergency?" subtitle="Tap one. Only hospitals that treat it are shown.">
        {conditions.loading ? <Loading /> : null}
        {conditions.error ? <ErrorBox message={conditions.error} onRetry={conditions.refresh} /> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {conditions.data?.map((c) => {
            const on = condition?.code === c.code;
            return (
              <Pressable
                key={c.code}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setRadiusIdx(0);
                  dispatch(conditionChosen(c));
                }}
                style={{
                  width: "48%",
                  minHeight: 78,
                  padding: space.md,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: on ? colors.danger : colors.border,
                  backgroundColor: on ? colors.dangerSoft : colors.white,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 22 }}>{c.icon}</Text>
                <Text style={{ fontSize: font.sm, fontWeight: "700", color: on ? colors.danger : colors.text }}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </QuestionCard>

      {condition && !place ? <Notice tone="amber">Set your location above to see hospitals near you.</Notice> : null}

      {condition && place ? (
        <>
          <H2>3. Alert a hospital near you</H2>
          <QuestionCard icon="call-outline" tone="amber" title="Who should the hospital call?">
            <TextField label="Patient name" required icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" />
            <PhoneField label="Contact number" required value={phone} onChange={setPhone} />
          </QuestionCard>
          {book.error ? <ErrorBox message={book.error} /> : null}

          {sos.isFetching ? <Loading label={`Finding hospitals within ${km} km that treat this…`} /> : null}
          {sos.error && !sos.isFetching ? (
            <ErrorBox message={errorMessage(sos.error)} onRetry={() => findHospitals({ emergencyType: condition.code, latitude: place.lat, longitude: place.lng, radiusKm: km })} />
          ) : null}

          {hospitals && !sos.isFetching ? (
            <>
              {hospitals.length === 0 ? (
                <Empty title={`No hospital within ${km} km can take this right now`} subtitle="Search wider, or call 108." />
              ) : (
                <Body muted>{`${hospitals.length} hospital${hospitals.length === 1 ? "" : "s"} within ${km} km with a doctor on duty for this. Nearest first.`}</Body>
              )}
              {hospitals.map((h) => (
                <Card key={h.hospitalId} style={{ gap: 6 }}>
                  <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <H2>{h.hospitalName}</H2>
                    </View>
                    {h.km != null ? <Badge label={`${h.km.toFixed(1)} km`} tone="blue" /> : null}
                  </Row>
                  <Body muted>{hospitalAddress(h.address)}</Body>
                  <KV k="Doctors on duty" v={String(h.availableDoctorCount)} />
                  {h.availableSpecialties?.length ? <KV k="Specialities" v={h.availableSpecialties.join(", ")} /> : null}
                  <Button
                    title="Alert this hospital"
                    icon="notifications-outline"
                    variant="danger"
                    loading={alerting === h.hospitalId}
                    disabled={!!alerting}
                    onPress={() => alertHospital(h)}
                  />
                  {h.contactDetails?.emergencyHotline || h.contactDetails?.phone ? (
                    <Button
                      title={`Call ${h.contactDetails.emergencyHotline || h.contactDetails.phone}`}
                      icon="call-outline"
                      variant="ghost"
                      small
                      onPress={() => Linking.openURL(`tel:${h.contactDetails.emergencyHotline || h.contactDetails.phone}`)}
                    />
                  ) : null}
                </Card>
              ))}
              {radiusIdx < RADII.length - 1 ? (
                <Button title={`Search wider (${RADII[radiusIdx + 1]} km)`} icon="expand-outline" variant="secondary" onPress={() => setRadiusIdx(radiusIdx + 1)} />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
