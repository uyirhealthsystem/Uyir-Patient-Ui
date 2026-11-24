import { useState } from "react";
import { useLazyNearbyHospitalsQuery, useLazySearchHospitalsQuery } from "../api";
import { HOSPITAL_TYPES, type Hospital, type HospitalType } from "../types";
import { hospitalAddress } from "../../../lib/format";
import { getCurrentPosition, useAction } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, ChipGroup, Empty, ErrorBox, H2, Row, Screen } from "../../../ui/components";
import { TextField } from "../../../ui/pickers";

export default function HospitalsScreen({ navigation }: AppScreen<"Hospitals">) {
  const [city, setCity] = useState("");
  const [type, setType] = useState<HospitalType | null>(null);
  const [results, setResults] = useState<Hospital[] | null>(null);
  const [heading, setHeading] = useState("");
  const [page, setPage] = useState({ page: 0, last: true });
  const { busy, error, run } = useAction();
  const [searchHospitals] = useLazySearchHospitalsQuery();
  const [nearbyHospitals] = useLazyNearbyHospitalsQuery();

  const search = (p = 0) =>
    run(async () => {
      const r = await searchHospitals({ city: city.trim() || undefined, hospitalType: type ?? undefined, page: p }).unwrap();
      setResults((prev) => (p === 0 ? r.content : [...(prev ?? []), ...r.content]));
      setPage({ page: r.page, last: r.last });
      setHeading(`${r.totalElements} hospital${r.totalElements === 1 ? "" : "s"}${city.trim() ? ` in ${city.trim()}` : ""}`);
    });

  const nearby = () =>
    run(async () => {
      const pos = await getCurrentPosition();
      const r = await nearbyHospitals({ latitude: pos.latitude, longitude: pos.longitude, radiusKm: 10 }).unwrap();
      setResults(r);
      setPage({ page: 0, last: true });
      setHeading(`${r.length} within 10 km of you`);
    });

  return (
    <Screen>
      <Button title="Hospitals near me" icon="locate-outline" variant="secondary" onPress={nearby} loading={busy && !results} />
      <TextField
        label="City"
        icon="search-outline"
        value={city}
        onChangeText={setCity}
        placeholder="Type a city or tap one"
        onSubmitEditing={() => search(0)}
        returnKeyType="search"
        suggestions={["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"]}
      />
      <ChipGroup label="Type" options={HOSPITAL_TYPES} value={type} onChange={(t) => setType(type === t ? null : t)} />
      <Button title="Search" onPress={() => search(0)} loading={busy} />
      {error ? <ErrorBox message={error} /> : null}

      {results ? (
        <>
          <H2>{heading}</H2>
          {results.length === 0 ? <Empty title="No hospitals found" subtitle="Try another city or type." /> : null}
          {results.map((h) => (
            <Card key={h.id} onPress={() => navigation.navigate("HospitalDetail", { id: h.id })}>
              <H2>{h.hospitalName}</H2>
              <Body muted>{hospitalAddress(h.address)}</Body>
              <Row style={{ flexWrap: "wrap" }}>
                <Badge label={h.hospitalType} tone="blue" />
                {h.emergencyServices?.handlesEmergencies ? <Badge label="24x7 Emergency" tone="red" /> : null}
                {h.emergencyServices?.ambulanceAvailable ? <Badge label="Ambulance" tone="amber" /> : null}
              </Row>
            </Card>
          ))}
          {!page.last ? <Button title="Load more" variant="ghost" onPress={() => search(page.page + 1)} loading={busy} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
