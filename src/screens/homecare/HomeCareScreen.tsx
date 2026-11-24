import { useState } from "react";
import { homeCareApi } from "../../api/endpoints";
import { CARE_TYPES, type CareType } from "../../api/types";
import { money } from "../../lib/format";
import { useLoad } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Body, Card, ChipGroup, Empty, ErrorBox, H2, KV, Loading, Screen } from "../../ui/components";

const CARE_LABEL: Record<CareType, string> = { NURSE: "Nursing", PHYSIO: "Physiotherapy", CARETAKER: "Caretaker" };

export default function HomeCareScreen({ navigation }: AppScreen<"HomeCare">) {
  const [careType, setCareType] = useState<CareType>("NURSE");
  const { data, error, loading, refreshing, refresh } = useLoad(() => homeCareApi.services(careType), [careType]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Body muted>Trained professionals visit you at home. Choose a service, pick a time, and pay once a provider confirms.</Body>
      <ChipGroup options={CARE_TYPES} value={careType} onChange={setCareType} format={(c) => CARE_LABEL[c]} />
      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data && data.length === 0 ? <Empty title="No services yet" subtitle="Check back soon." /> : null}
      {data?.map((s) => (
        <Card key={s.id} onPress={() => navigation.navigate("HomeCareBook", { serviceId: s.id })}>
          <H2>{s.name}</H2>
          {s.description ? <Body muted>{s.description}</Body> : null}
          <KV k="Duration" v={`${s.durationMinutes} min`} />
          <KV k="Price" v={money(s.price)} />
        </Card>
      ))}
    </Screen>
  );
}
