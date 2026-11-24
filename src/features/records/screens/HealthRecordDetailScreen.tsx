import { useHealthRecordQuery } from "../api";
import { dateTime } from "../../../lib/format";
import { useScreenQuery } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Body, Card, ErrorBox, H2, Ionicons, KV, Loading, Row, Screen, Title, humanize } from "../../../ui/components";
import { colors } from "../../../ui/theme";

const SHOWN = new Set(["id", "title", "recordType", "source", "providerName", "recordedAt", "summary", "attachments", "familyMemberId"]);

export default function HealthRecordDetailScreen({ route }: AppScreen<"HealthRecordDetail">) {
  const { data: r, error, loading, refresh } = useScreenQuery(useHealthRecordQuery(route.params.id), { onFocus: false });
  if (loading) return <Loading />;
  if (error || !r) return <Screen><ErrorBox message={error ?? "Not found"} onRetry={refresh} /></Screen>;

  // Show any other simple fields the record carries.
  const extra = Object.entries(r).filter(([k, v]) => !SHOWN.has(k) && (typeof v === "string" || typeof v === "number") && !/At$|Id$/.test(k));

  return (
    <Screen>
      <Title>{r.title ?? (r.recordType ? humanize(r.recordType) : "Health record")}</Title>
      <Card>
        <KV k="Type" v={r.recordType ? humanize(r.recordType) : undefined} />
        <KV k="Provider" v={r.providerName ?? undefined} />
        <KV k="Source" v={r.source ? humanize(r.source) : undefined} />
        <KV k="Recorded" v={dateTime(r.recordedAt)} />
        {extra.map(([k, v]) => (
          <KV key={k} k={humanize(k.replace(/([A-Z])/g, "_$1").toUpperCase())} v={String(v)} />
        ))}
      </Card>
      {r.summary ? (
        <Card>
          <H2>Summary</H2>
          <Body>{r.summary}</Body>
        </Card>
      ) : null}
      {r.attachments?.length ? (
        <Card>
          <H2>Attachments</H2>
          {r.attachments.map((a) => (
            <Row key={a.id}><Ionicons name="attach-outline" size={18} color={colors.textMuted} /><Body>{a.fileName ?? a.contentType ?? a.id}</Body></Row>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
