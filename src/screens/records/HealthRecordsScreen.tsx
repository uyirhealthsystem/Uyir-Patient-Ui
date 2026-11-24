import { useState } from "react";
import { usersApi } from "../../api/endpoints";
import type { HealthRecord } from "../../api/types";
import { dateOnly } from "../../lib/format";
import { useAction, useLoad } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Badge, Body, Button, Card, Empty, ErrorBox, H2, Loading, Row, Screen } from "../../ui/components";
import { MemberPicker, useFamily } from "./MemberPicker";

export default function HealthRecordsScreen({ navigation }: AppScreen<"HealthRecords">) {
  const [member, setMember] = useState("self");
  const family = useFamily();
  const [more, setMore] = useState<{ rows: HealthRecord[]; next: { before: string; beforeId: string } | null } | null>(null);
  const first = useLoad(async () => {
    setMore(null);
    return usersApi.healthRecords({ memberId: member });
  }, [member]);
  const page = useAction();

  const rows = [...(first.data?.healthRecords ?? []), ...(more?.rows ?? [])];
  const next = more ? more.next : first.data?.next;

  const loadMore = () =>
    page.run(async () => {
      if (!next) return;
      const r = await usersApi.healthRecords({ memberId: member, ...next });
      setMore({ rows: [...(more?.rows ?? []), ...r.healthRecords], next: r.next });
    });

  return (
    <Screen refreshing={first.refreshing} onRefresh={first.refresh}>
      <Body muted>Records shared with you by hospitals and doctors, including through your ABHA.</Body>
      <MemberPicker family={family.data ?? []} value={member} onChange={setMember} />
      {first.loading ? <Loading /> : null}
      {first.error ? <ErrorBox message={first.error} onRetry={first.refresh} /> : null}
      {!first.loading && rows.length === 0 ? <Empty title="No records yet" subtitle="Records appear here when a provider shares them." /> : null}
      {rows.map((r) => (
        <Card key={r.id} onPress={() => navigation.navigate("HealthRecordDetail", { id: r.id })}>
          <Row style={{ justifyContent: "space-between" }}>
            <H2>{r.title ?? r.recordType ?? "Health record"}</H2>
            {r.recordType ? <Badge label={r.recordType} tone="blue" /> : null}
          </Row>
          <Body muted>{[r.providerName, dateOnly(r.recordedAt)].filter(Boolean).join(" · ")}</Body>
        </Card>
      ))}
      {page.error ? <ErrorBox message={page.error} /> : null}
      {next ? <Button title="Load more" variant="ghost" onPress={loadMore} loading={page.busy} /> : null}
    </Screen>
  );
}
