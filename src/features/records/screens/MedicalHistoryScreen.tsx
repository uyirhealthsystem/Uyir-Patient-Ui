import { useState } from "react";
import { useMedicalHistoryQuery } from "../api";
import { dateOnly, dateTime } from "../../../lib/format";
import { useScreenQuery } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Body, Card, ErrorBox, H2, KV, Loading, Screen, humanize } from "../../../ui/components";
import { MemberPicker, useFamily } from "../components/MemberPicker";

export default function MedicalHistoryScreen({ navigation }: AppScreen<"MedicalHistory">) {
  const [member, setMember] = useState("self");
  const family = useFamily();
  const { data: h, error, loading, refreshing, refresh } = useScreenQuery(useMedicalHistoryQuery({ memberId: member }));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <MemberPicker family={family.data ?? []} value={member} onChange={setMember} />
      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {h ? (
        <>
          <Card>
            <H2>ABHA</H2>
            {h.abha ? (
              <>
                <KV k="ABHA number" v={h.abha.abhaNumber ?? undefined} />
                <KV k="ABHA address" v={h.abha.abhaAddress ?? undefined} />
              </>
            ) : (
              <Body muted>Not linked.</Body>
            )}
          </Card>
          <Section title="Active conditions" empty="None recorded" onPress={() => navigation.navigate("MedicalList", { kind: "conditions" })}>
            {h.conditions.map((c) => <Body key={c.id}>• {c.name}{c.diagnosedOn ? ` (since ${dateOnly(c.diagnosedOn)})` : ""}</Body>)}
          </Section>
          <Section title="Allergies" empty="None recorded" onPress={() => navigation.navigate("MedicalList", { kind: "allergies" })}>
            {h.allergies.map((a) => <Body key={a.id}>• {a.allergen}{a.severity ? ` — ${humanize(a.severity)}` : ""}</Body>)}
          </Section>
          <Section title="Current medications" empty="None recorded" onPress={() => navigation.navigate("MedicalList", { kind: "medications" })}>
            {h.currentMedications.map((m) => <Body key={m.id}>• {[m.name, m.dosage, m.frequency].filter(Boolean).join(" · ")}</Body>)}
          </Section>
          <Section title="Latest vitals" empty="No readings" onPress={() => navigation.navigate("MedicalList", { kind: "vitals" })}>
            {h.latestVitals.map((v) => (
              <KV key={v.id} k={humanize(v.type)} v={`${v.value}${v.secondaryValue != null ? `/${v.secondaryValue}` : ""} ${v.unit} · ${dateTime(v.measuredAt)}`} />
            ))}
          </Section>
          <Section title="Recent provider records" empty="None yet" onPress={() => navigation.navigate("HealthRecords")}>
            {h.recentHealthRecords.slice(0, 5).map((r) => <Body key={r.id}>• {r.title ?? r.recordType ?? "Record"} — {dateOnly(r.recordedAt)}</Body>)}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function Section({ title, empty, onPress, children }: { title: string; empty: string; onPress: () => void; children: React.ReactNode[] }) {
  return (
    <Card onPress={onPress}>
      <H2>{title} ›</H2>
      {children.length ? children : <Body muted>{empty}</Body>}
    </Card>
  );
}
