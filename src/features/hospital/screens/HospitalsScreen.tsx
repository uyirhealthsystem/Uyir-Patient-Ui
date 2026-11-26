import { useEffect, useMemo, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { useLazyHospitalsByDistrictQuery, useLazyNearbyHospitalsQuery, useSearchHospitalsQuery } from "../api";
import { addressCoords, type Hospital } from "../types";
import { hospitalAddress } from "../../../lib/format";
import { getCurrentPosition, useAction, type Coords } from "../../../lib/hooks";
import { distanceKm } from "../../../lib/location";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, ChipGroup, Empty, ErrorBox, H2, Ionicons, Loading, Row, Screen } from "../../../ui/components";
import { Segmented } from "../../../ui/form";
import { TextField } from "../../../ui/pickers";
import { colors } from "../../../ui/theme";

type Mode = "nearby" | "name" | "district";
const RADII = ["5", "10", "25", "50"] as const;
type Radius = (typeof RADII)[number];

/**
 * Hospital appointment, step 1: find a hospital.
 * Nearby (from the device's location, loaded on open), by name, or by district.
 * Tapping a hospital opens HospitalDetail -> pick a doctor -> BookAppointment.
 */
export default function HospitalsScreen({ navigation }: AppScreen<"Hospitals">) {
  const [mode, setMode] = useState<Mode>("nearby");
  const [me, setMe] = useState<Coords | null>(null);

  // ── Nearby ────────────────────────────────────────────────────────────────
  const [radius, setRadius] = useState<Radius>("10");
  const [nearby, setNearby] = useState<Hospital[] | null>(null);
  const nearbyAction = useAction();
  const [fetchNearby] = useLazyNearbyHospitalsQuery();
  const loadNearby = (km: Radius = radius) =>
    nearbyAction.run(async () => {
      const pos = await getCurrentPosition();
      setMe(pos);
      setNearby(await fetchNearby({ latitude: pos.latitude, longitude: pos.longitude, radiusKm: Number(km) }).unwrap());
    });
  useEffect(() => {
    void loadNearby();
    // Only on open; the patient refreshes or changes the radius after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── By name: hospitalservice has no name filter, so filter the active list here.
  const all = useSearchHospitalsQuery({ size: 200 });
  const [name, setName] = useState("");
  const byName = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return null;
    return (all.data?.content ?? []).filter(
      (h) => h.hospitalName.toLowerCase().includes(q) || h.address?.city?.toLowerCase().includes(q),
    );
  }, [name, all.data]);

  // ── By district ───────────────────────────────────────────────────────────
  const [district, setDistrict] = useState("");
  const [byDistrict, setByDistrict] = useState<{ district: string; list: Hospital[] } | null>(null);
  const districtAction = useAction();
  const [fetchDistrict] = useLazyHospitalsByDistrictQuery();
  const districts = useMemo(
    () => [...new Set((all.data?.content ?? []).map((h) => h.address?.district).filter((d): d is string => !!d))].sort(),
    [all.data],
  );
  const searchDistrict = (d = district) => {
    const q = d.trim();
    if (!q) return districtAction.setError("Type or pick a district.");
    Keyboard.dismiss();
    setDistrict(q);
    districtAction.run(async () => setByDistrict({ district: q, list: await fetchDistrict(q).unwrap() }));
  };

  // Nearest first whenever we know where the patient is.
  const withDistance = (list: Hospital[]) =>
    list
      .map((h) => {
        const c = addressCoords(h.address);
        return { h, km: me && c ? distanceKm(me, c) : null };
      })
      .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));

  const open = (h: Hospital) => navigation.navigate("HospitalDetail", { id: h.id });

  return (
    <Screen>
      <Segmented
        options={[
          { value: "nearby", label: "Nearby", icon: "locate-outline" },
          { value: "name", label: "Name", icon: "search-outline" },
          { value: "district", label: "District", icon: "map-outline" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === "nearby" ? (
        <>
          <ChipGroup label="Within" options={RADII} value={radius} format={(r) => `${r} km`} onChange={(r) => { setRadius(r); void loadNearby(r); }} />
          {nearbyAction.error ? (
            <ErrorBox message={nearbyAction.error} onRetry={() => loadNearby()} />
          ) : nearby === null || (nearbyAction.busy && !nearby.length) ? (
            <Loading />
          ) : (
            <Results
              heading={`${nearby.length} hospital${nearby.length === 1 ? "" : "s"} within ${radius} km`}
              items={withDistance(nearby)}
              onOpen={open}
              empty={{ title: "No hospitals nearby", subtitle: "Try a wider radius, or search by name or district." }}
              action={<Button title="Refresh" icon="refresh-outline" variant="ghost" onPress={() => loadNearby()} loading={nearbyAction.busy} />}
            />
          )}
        </>
      ) : null}

      {mode === "name" ? (
        <>
          <TextField label="Hospital name" icon="search-outline" value={name} onChangeText={setName} placeholder="e.g. Uyir, Shanthiniketan" autoFocus returnKeyType="search" />
          {all.error ? <ErrorBox message="Could not load hospitals." onRetry={all.refetch} /> : null}
          {all.isLoading ? <Loading /> : null}
          {byName ? (
            <Results
              heading={`${byName.length} match${byName.length === 1 ? "" : "es"} for "${name.trim()}"`}
              items={withDistance(byName)}
              onOpen={open}
              empty={{ title: "No hospital with that name", subtitle: "Check the spelling, or search by district." }}
            />
          ) : null}
        </>
      ) : null}

      {mode === "district" ? (
        <>
          <TextField
            label="District"
            icon="map-outline"
            value={district}
            onChangeText={setDistrict}
            placeholder="Type or pick a district"
            suggestions={districts}
            onSubmitEditing={() => searchDistrict()}
            returnKeyType="search"
          />
          <Button title="Search" icon="search-outline" onPress={() => searchDistrict()} loading={districtAction.busy} />
          {districtAction.error ? <ErrorBox message={districtAction.error} /> : null}
          {byDistrict ? (
            <Results
              heading={`${byDistrict.list.length} hospital${byDistrict.list.length === 1 ? "" : "s"} in ${byDistrict.district}`}
              items={withDistance(byDistrict.list)}
              onOpen={open}
              empty={{ title: `No hospitals in ${byDistrict.district}`, subtitle: "Try a nearby district." }}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Results({
  heading,
  items,
  onOpen,
  empty,
  action,
}: {
  heading: string;
  items: { h: Hospital; km: number | null }[];
  onOpen: (h: Hospital) => void;
  empty: { title: string; subtitle: string };
  action?: React.ReactNode;
}) {
  return (
    <>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <H2>{heading}</H2>
        {action}
      </Row>
      {items.length === 0 ? <Empty icon="business-outline" title={empty.title} subtitle={empty.subtitle} /> : null}
      {items.map(({ h, km }) => (
        <Card key={h.id} onPress={() => onOpen(h)}>
          <Row style={{ alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <H2>{h.hospitalName}</H2>
              <Body muted>{hospitalAddress(h.address)}</Body>
            </View>
            {km != null ? (
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.primary }}>{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</Text>
            ) : null}
          </Row>
          <Row style={{ flexWrap: "wrap", alignItems: "center" }}>
            <Badge label={h.hospitalType} tone="blue" />
            {h.emergencyServices?.handlesEmergencies ? <Badge label="24x7 Emergency" tone="red" /> : null}
            <View style={{ flex: 1 }} />
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Book appointment</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Row>
        </Card>
      ))}
    </>
  );
}
