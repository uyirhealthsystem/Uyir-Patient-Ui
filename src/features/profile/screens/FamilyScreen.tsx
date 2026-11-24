import { useFamilyQuery } from "../api";
import { dateOnly } from "../../../lib/format";
import { useScreenQuery } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Body, Button, Card, Empty, ErrorBox, H2, Loading, Row, Screen } from "../../../ui/components";

export default function FamilyScreen({ navigation }: AppScreen<"Family">) {
  const { data, error, loading, refreshing, refresh } = useScreenQuery(useFamilyQuery());
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Button title="+ Add family member" onPress={() => navigation.navigate("FamilyMemberForm")} />
      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data && data.length === 0 ? <Empty title="No family members yet" subtitle="Add the people you book care for." /> : null}
      {data?.map((m) => (
        <Card key={m.id} onPress={() => navigation.navigate("FamilyMemberForm", { member: m })}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{m.fullName}</H2>
            <Badge label={m.relationship} tone="blue" />
          </Row>
          <Body muted>{[m.dateOfBirth ? dateOnly(m.dateOfBirth) : null, m.bloodGroup, m.phone].filter(Boolean).join(" · ")}</Body>
        </Card>
      ))}
    </Screen>
  );
}
