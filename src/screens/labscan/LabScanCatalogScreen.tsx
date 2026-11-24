import { useMemo, useState } from "react";
import { labScanApi } from "../../api/endpoints";
import type { PatientLab, PatientScanCenter } from "../../api/types";
import { money } from "../../lib/format";
import { useLoad } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Body, Button, Card, Empty, ErrorBox, H2, KV, Loading, Notice, Screen } from "../../ui/components";
import { space } from "../../ui/theme";

export default function LabScanCatalogScreen({ navigation, route }: AppScreen<"LabScanCatalog">) {
  const { kind, centerId, centerName, initialMode } = route.params;
  const [selected, setSelected] = useState<string[]>([]);
  const { data, error, loading, refreshing, refresh } = useLoad(
    async () => {
      if (kind === "LAB") {
        const labs = await labScanApi.labs();
        return labs.find((lab) => lab.labId === centerId) ?? null;
      }
      const centers = await labScanApi.scanCenters();
      return centers.find((center) => center.scanCenterId === centerId) ?? null;
    },
    [kind, centerId],
  );

  const items = useMemo(() => {
    if (!data) return [];
    return kind === "LAB" ? (data as PatientLab).tests : (data as PatientScanCenter).services;
  }, [data, kind]);

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const proceed = () => {
    if (!selected.length) return;
    navigation.navigate("LabScanBooking", {
      kind,
      centerId,
      centerName,
      itemIds: selected,
      mode: initialMode ?? "CENTER",
    });
  };

  if (loading) return <Loading />;
  if (error || !data) return <Screen><ErrorBox message={error ?? "This center is no longer available."} onRetry={refresh} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} footer={<Button title={`Continue · ${selected.length} selected`} onPress={proceed} disabled={!selected.length} />}>
      <H2>{centerName}</H2>
      <Body muted>{kind === "LAB" ? "Select one or more tests." : "Select one or more scan services."}</Body>
      {items.length === 0 ? <Empty title="No services available" subtitle="This center has no active offerings right now." /> : null}
      {kind === "LAB"
        ? (data as PatientLab).tests.map((test) => {
            const name = test.testCatalog.name;
            const active = selected.includes(test.labTestId);
            return (
              <Card key={test.labTestId} onPress={() => toggle(test.labTestId)} style={active ? { borderColor: "#2F6FED" } : undefined}>
                <H2>{name}</H2>
                {test.testCatalog.description ? <Body muted>{test.testCatalog.description}</Body> : null}
                <KV k="Price" v={money(test.price)} />
                <KV k="Sample" v={test.testCatalog.sampleType} />
                <KV k="Fasting" v={test.testCatalog.fastingRequirement === "REQUIRED" ? `Required${test.testCatalog.fastingHours ? ` · ${test.testCatalog.fastingHours} hours` : ""}` : test.testCatalog.fastingRequirement === "OPTIONAL" ? "Optional" : "Not required"} />
                {test.turnaroundTime != null ? <KV k="Result time" v={`${test.turnaroundTime} hours`} /> : null}
                {test.testCatalog.preparationInstructions ? <Notice>{test.testCatalog.preparationInstructions}</Notice> : null}
                <Button title={active ? "Remove from booking" : "Select test"} variant={active ? "secondary" : "outline"} icon={active ? "checkmark-circle" : "add-circle-outline"} onPress={() => toggle(test.labTestId)} />
              </Card>
            );
          })
        : (data as PatientScanCenter).services.map((service) => {
            const active = selected.includes(service.scanServiceId);
            return (
              <Card key={service.scanServiceId} onPress={() => toggle(service.scanServiceId)} style={active ? { borderColor: "#2F6FED" } : undefined}>
                <H2>{service.serviceCatalog.name}</H2>
                {service.serviceCatalog.description ? <Body muted>{service.serviceCatalog.description}</Body> : null}
                <KV k="Price" v={money(service.price)} />
                {service.turnaroundTime != null ? <KV k="Result time" v={`${service.turnaroundTime} hours`} /> : null}
                <KV k="Home visit" v={service.homeServiceAvailable ? "Available" : "Not available"} />
                {service.equipmentRequired ? <Body muted>Equipment is required. The center will confirm availability.</Body> : null}
                <Button title={active ? "Remove from booking" : "Select scan"} variant={active ? "secondary" : "outline"} icon={active ? "checkmark-circle" : "add-circle-outline"} onPress={() => toggle(service.scanServiceId)} />
              </Card>
            );
          })}
      <Body muted style={{ paddingBottom: space.sm }}>{selected.length ? `${selected.length} selected` : "Select a service to continue."}</Body>
    </Screen>
  );
}
