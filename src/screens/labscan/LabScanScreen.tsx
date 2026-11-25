import { useCallback, useEffect, useState } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { labScanApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import type { LabScanAppointmentType, PatientLab, PatientScanCenter } from "../../api/types";
import { useAuth } from "../../features/auth/useAuth";
import { money } from "../../lib/format";
import type { AppStackParams, AppScreen } from "../../navigation/types";
import { Body, Card, Empty, ErrorBox, H2, KV, Loading, Screen } from "../../ui/components";
import { Segmented } from "../../ui/form";

type Props = {
  navigation: NativeStackNavigationProp<AppStackParams, any>;
  sampleCollectionOnly?: boolean;
};

const TYPES = [
  { value: "LAB" as const, label: "Lab tests", icon: "flask-outline" as const },
  { value: "SCAN" as const, label: "Scans", icon: "scan-outline" as const },
];

export function LabScanDiscovery({ navigation, sampleCollectionOnly = false }: Props) {
  const { me } = useAuth();
  const district = me?.profile?.district?.trim() || undefined;

  const [kind, setKind] = useState<LabScanAppointmentType>("LAB");
  const [labs, setLabs] = useState<PatientLab[]>([]);
  const [centers, setCenters] = useState<PatientScanCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        if (kind === "LAB") {
          const rows = await labScanApi.labs(district);
          setLabs(rows ?? []);
        } else {
          const rows = await labScanApi.scanCenters(district);
          setCenters(rows ?? []);
        }
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [kind, district],
  );

  useEffect(() => {
    loadItems(false);
  }, [loadItems]);

  const refresh = () => loadItems(true);
  const items = kind === "LAB" ? labs : centers;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Body muted>
        {sampleCollectionOnly
          ? "Choose a lab and tests. A trained collector will visit your address to collect the sample."
          : "Find a nearby lab or scan center, choose a service, and book a time."}
      </Body>
      {!sampleCollectionOnly ? <Segmented options={TYPES} value={kind} onChange={setKind} /> : null}
      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {!loading && !error && items.length === 0 ? (
        <Empty
          title={kind === "LAB" ? "No labs available" : "No scan centers available"}
          subtitle={district ? `No centers listed in ${district} yet.` : "Please check back later."}
        />
      ) : null}
      {kind === "LAB"
        ? labs.map((lab) => (
            <Card
              key={lab.labId}
              onPress={() =>
                navigation.navigate("LabScanCatalog", {
                  kind: "LAB",
                  centerId: lab.labId,
                  centerName: lab.name,
                  initialMode: sampleCollectionOnly ? "HOME" : "CENTER",
                })
              }
            >
              <H2>{lab.name}</H2>
              <Body muted>{lab.address ?? "Address not available"}</Body>
              <KV k="Tests available" v={String(lab.tests.length)} />
              {lab.tests.length ? <KV k="From" v={money(lab.tests[0].price)} /> : null}
            </Card>
          ))
        : centers.map((center) => (
            <Card
              key={center.scanCenterId}
              onPress={() =>
                navigation.navigate("LabScanCatalog", {
                  kind: "SCAN",
                  centerId: center.scanCenterId,
                  centerName: center.name,
                  initialMode: "CENTER",
                })
              }
            >
              <H2>{center.name}</H2>
              <Body muted>{center.address ?? "Address not available"}</Body>
              <KV k="Scans available" v={String(center.services.length)} />
              {center.services.length ? <KV k="From" v={money(center.services[0].price)} /> : null}
              {center.services.some((service) => service.homeServiceAvailable) ? (
                <Body muted>Some services support home visits.</Body>
              ) : null}
            </Card>
          ))}
    </Screen>
  );
}

export default function LabScanScreen({ navigation }: AppScreen<"LabScan">) {
  return <LabScanDiscovery navigation={navigation} />;
}