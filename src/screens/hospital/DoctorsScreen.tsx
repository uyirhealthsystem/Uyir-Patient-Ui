import { useEffect, useState } from "react";
import { hospitalApi } from "../../api/endpoints";
import type { Doctor } from "../../api/types";
import { money } from "../../lib/format";
import { useAction, useLoad } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Badge, Body, Button, Card, ChipGroup, Empty, ErrorBox, H2, KV, Row, Screen } from "../../ui/components";

export default function DoctorsScreen({ navigation, route }: AppScreen<"Doctors">) {
  const hospitalId = route.params?.hospitalId;
  const [specialty, setSpecialty] = useState<string | null>(route.params?.specialty ?? null);
  const [category, setCategory] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [page, setPage] = useState({ page: 0, last: true });
  const specialties = useLoad(() => hospitalApi.specialties(), [], { onFocus: false });
  const { busy, error, run } = useAction();

  const search = (p = 0) =>
    run(async () => {
      const r = await hospitalApi.searchDoctors({ specialty: specialty ?? undefined, hospitalId }, p);
      setDoctors((prev) => (p === 0 ? r.content : [...(prev ?? []), ...r.content]));
      setPage({ page: r.page, last: r.last });
    });

  useEffect(() => {
    void search(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty]);

  const cats = specialties.data ?? [];
  const activeCat = cats.find((c) => c.category === category);

  return (
    <Screen>
      {route.params?.hospitalName ? <Body muted>At {route.params.hospitalName}</Body> : null}
      {cats.length ? (
        <ChipGroup
          label="Speciality area"
          options={cats.map((c) => c.category)}
          value={category}
          onChange={(c) => {
            setCategory(category === c ? null : c);
            setSpecialty(null);
          }}
        />
      ) : null}
      {activeCat ? (
        <ChipGroup
          label="Speciality"
          options={activeCat.specialties.map((s) => s.name)}
          value={specialty}
          onChange={(s) => setSpecialty(specialty === s ? null : s)}
        />
      ) : null}
      {specialties.error ? <ErrorBox message={specialties.error} /> : null}
      {error ? <ErrorBox message={error} onRetry={() => search(0)} /> : null}

      <H2>{specialty ?? "All doctors"}</H2>
      {doctors && doctors.length === 0 ? <Empty title="No doctors found" subtitle="Try another speciality." /> : null}
      {doctors?.map((d) => {
        const assocs = (d.hospitalAssociations ?? []).filter((a) => a.active !== false && (!hospitalId || a.hospitalId === hospitalId));
        return (
          <Card key={d.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <H2>{d.name}</H2>
              {d.checkedInAt ? <Badge label="Available now" tone="green" /> : null}
            </Row>
            <Body muted>{[d.specialties?.join(", "), d.qualifications?.join(", ")].filter(Boolean).join(" · ")}</Body>
            <KV k="Experience" v={d.yearsOfExperience != null ? `${d.yearsOfExperience} yrs` : undefined} />
            <KV k="Fee" v={money(assocs[0]?.consultationFee ?? d.consultationFee)} />
            <KV k="Timings" v={d.availability?.customTimings} />
            {assocs.length === 0 ? (
              <Body muted>Not taking bookings right now.</Body>
            ) : (
              assocs.map((a) => (
                <Button
                  key={a.hospitalId}
                  title={assocs.length > 1 ? `Book · ${a.department ?? "Hospital"}` : "Book appointment"}
                  onPress={() => navigation.navigate("BookAppointment", { hospitalId: a.hospitalId, doctorId: d.id })}
                />
              ))
            )}
          </Card>
        );
      })}
      {!page.last ? <Button title="Load more" variant="ghost" onPress={() => search(page.page + 1)} loading={busy} /> : null}
      {busy && !doctors ? <Body muted>Loading doctors…</Body> : null}
    </Screen>
  );
}
