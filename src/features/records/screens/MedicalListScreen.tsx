import { useLayoutEffect, useState } from "react";
import { Alert, View } from "react-native";
import { errorMessage } from "../../../services/http";
import { useCreateMedicalMutation, useMedicalListQuery, useRemoveMedicalMutation, useUpdateMedicalMutation } from "../api";
import { VITAL_UNITS, type Allergy, type Condition, type Medication, type Vital, type VitalType } from "../types";
import { dateOnly, dateTime, ymd } from "../../../lib/format";
import { useAction, useScreenQuery } from "../../../lib/hooks";
import type { AppScreen, MedicalKind } from "../../../navigation/types";
import { Badge, Body, Button, Card, Empty, ErrorBox, H2, KV, Loading, Row, Screen, humanize, type IconName } from "../../../ui/components";
import { Chips, IconGrid, Segmented } from "../../../ui/form";
import { DateField, IconChoice, QuestionCard, TextField } from "../../../ui/pickers";
import { MemberPicker, useFamily } from "../components/MemberPicker";

const TITLES: Record<MedicalKind, string> = { conditions: "Conditions", allergies: "Allergies", medications: "Medications", vitals: "Vitals" };

export default function MedicalListScreen({ navigation, route }: AppScreen<"MedicalList">) {
  const { kind } = route.params;
  const [member, setMember] = useState("self");
  const [adding, setAdding] = useState(false);
  const family = useFamily();
  useLayoutEffect(() => navigation.setOptions({ title: TITLES[kind] }), [navigation, kind]);

  // Mutations invalidate this list, so it refetches by itself after a change.
  const list = useScreenQuery(useMedicalListQuery({ kind, memberId: member }));
  const [removeMedical] = useRemoveMedicalMutation();
  const [updateMedical] = useUpdateMedicalMutation();
  const familyMemberId = member === "self" ? null : member;

  const remove = (id: string) =>
    Alert.alert("Delete this entry?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMedical({ kind, id }).unwrap();
          } catch (e) {
            Alert.alert("Could not delete", errorMessage(e));
          }
        },
      },
    ]);

  const update = async (id: string, body: Record<string, unknown>) => {
    try {
      await updateMedical({ kind, id, body }).unwrap();
    } catch (e) {
      Alert.alert("Could not update", errorMessage(e));
    }
  };

  return (
    <Screen refreshing={list.refreshing} onRefresh={list.refresh}>
      <MemberPicker family={family.data ?? []} value={member} onChange={setMember} />
      {adding ? (
        <AddForm kind={kind} familyMemberId={familyMemberId} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <Button icon="add-circle-outline" title={`Add ${kind === "vitals" ? "reading" : TITLES[kind].toLowerCase().replace(/s$/, "").replace(/ie$/, "y")}`} onPress={() => setAdding(true)} />
      )}
      {list.loading ? <Loading /> : null}
      {list.error ? <ErrorBox message={list.error} onRetry={list.refresh} /> : null}
      {list.data && list.data.length === 0 && !adding ? <Empty title={`No ${TITLES[kind].toLowerCase()} recorded`} /> : null}

      {list.data?.map((r) =>
        kind === "conditions" ? (
          <ConditionCard key={r.id} c={r} onDelete={() => remove(r.id)} onToggle={() => update(r.id, { status: r.status === "ACTIVE" ? "RESOLVED" : "ACTIVE" })} />
        ) : kind === "allergies" ? (
          <AllergyCard key={r.id} a={r} onDelete={() => remove(r.id)} />
        ) : kind === "medications" ? (
          <MedicationCard key={r.id} m={r} onDelete={() => remove(r.id)} onStop={() => update(r.id, { endDate: ymd(new Date()) })} />
        ) : (
          <VitalCard key={r.id} v={r} onDelete={() => remove(r.id)} />
        ),
      )}
    </Screen>
  );
}

function ConditionCard({ c, onDelete, onToggle }: { c: Condition; onDelete: () => void; onToggle: () => void }) {
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <H2>{c.name}</H2>
        <Badge label={c.status} tone={c.status === "ACTIVE" ? "amber" : "green"} />
      </Row>
      <KV k="Diagnosed" v={c.diagnosedOn ? dateOnly(c.diagnosedOn) : undefined} />
      {c.notes ? <Body muted>{c.notes}</Body> : null}
      <Row>
        <Button title={c.status === "ACTIVE" ? "Mark resolved" : "Mark active"} variant="ghost" onPress={onToggle} />
        <Button title="Delete" variant="ghost" onPress={onDelete} />
      </Row>
    </Card>
  );
}

function AllergyCard({ a, onDelete }: { a: Allergy; onDelete: () => void }) {
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <H2>{a.allergen}</H2>
        {a.severity ? <Badge label={a.severity} tone={a.severity === "SEVERE" ? "red" : a.severity === "MODERATE" ? "amber" : "gray"} /> : null}
      </Row>
      <KV k="Type" v={humanize(a.category)} />
      <KV k="Reaction" v={a.reaction ?? undefined} />
      {a.notes ? <Body muted>{a.notes}</Body> : null}
      <Button title="Delete" variant="ghost" onPress={onDelete} style={{ alignSelf: "flex-start" }} />
    </Card>
  );
}

function MedicationCard({ m, onDelete, onStop }: { m: Medication; onDelete: () => void; onStop: () => void }) {
  const current = !m.endDate || new Date(m.endDate) >= new Date(new Date().toDateString());
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <H2>{m.name}</H2>
        <Badge label={current ? "CURRENT" : "STOPPED"} tone={current ? "green" : "gray"} />
      </Row>
      <KV k="Dosage" v={m.dosage ?? undefined} />
      <KV k="Frequency" v={m.frequency ?? undefined} />
      <KV k="From" v={m.startDate ? dateOnly(m.startDate) : undefined} />
      <KV k="Until" v={m.endDate ? dateOnly(m.endDate) : undefined} />
      <KV k="Prescribed by" v={m.prescribedBy ?? undefined} />
      <Row>
        {current ? <Button title="Stop today" variant="ghost" onPress={onStop} /> : null}
        <Button title="Delete" variant="ghost" onPress={onDelete} />
      </Row>
    </Card>
  );
}

function VitalCard({ v, onDelete }: { v: Vital; onDelete: () => void }) {
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <H2>{humanize(v.type)}</H2>
        <H2>
          {v.value}
          {v.secondaryValue != null ? `/${v.secondaryValue}` : ""} {v.unit}
        </H2>
      </Row>
      <Body muted>{dateTime(v.measuredAt)}</Body>
      {v.notes ? <Body muted>{v.notes}</Body> : null}
      <Button title="Delete" variant="ghost" onPress={onDelete} style={{ alignSelf: "flex-start" }} />
    </Card>
  );
}

/// ── Add forms ──────────────────────────────────────────────────────────────
const VITAL_OPTIONS: { value: VitalType; label: string; icon: IconName }[] = [
  { value: "BLOOD_PRESSURE", label: "Blood pressure", icon: "heart-outline" },
  { value: "BLOOD_SUGAR", label: "Blood sugar", icon: "water-outline" },
  { value: "HEART_RATE", label: "Pulse", icon: "pulse-outline" },
  { value: "SPO2", label: "Oxygen (SpO₂)", icon: "fitness-outline" },
  { value: "TEMPERATURE", label: "Temperature", icon: "thermometer-outline" },
  { value: "WEIGHT", label: "Weight", icon: "barbell-outline" },
  { value: "HEIGHT", label: "Height", icon: "resize-outline" },
];
const VITAL_HINT: Partial<Record<VitalType, string>> = {
  BLOOD_SUGAR: "Normal fasting: 70–100 mg/dL",
  HEART_RATE: "Normal resting: 60–100 bpm",
  SPO2: "Normal: 95–100%",
  TEMPERATURE: "Normal: about 36.5–37.5 °C",
};
const KIND_HEAD: Record<MedicalKind, { icon: IconName; tone: "primary" | "red" | "violet" | "green"; title: string }> = {
  conditions: { icon: "fitness-outline", tone: "primary", title: "Add a condition" },
  allergies: { icon: "warning-outline", tone: "red", title: "Add an allergy" },
  medications: { icon: "medical-outline", tone: "violet", title: "Add a medicine" },
  vitals: { icon: "pulse-outline", tone: "green", title: "Add a reading" },
};
const ALLERGY_KINDS = [
  { value: "FOOD" as const, label: "Food", icon: "fast-food-outline" as const },
  { value: "DRUG" as const, label: "Medicine", icon: "medkit-outline" as const },
  { value: "ENVIRONMENT" as const, label: "Dust/Pollen", icon: "leaf-outline" as const },
  { value: "OTHER" as const, label: "Other", icon: "ellipsis-horizontal" as const },
];
const ALLERGENS: Partial<Record<Allergy["category"], string[]>> = {
  FOOD: ["Peanuts", "Milk", "Egg", "Seafood", "Wheat"],
  DRUG: ["Penicillin", "Sulfa drugs", "Aspirin", "Ibuprofen"],
  ENVIRONMENT: ["Dust", "Pollen", "Pet hair", "Mould"],
};

function AddForm({ kind, familyMemberId, onDone, onCancel }: { kind: MedicalKind; familyMemberId: string | null; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Allergy["category"] | null>(null);
  const [severity, setSeverity] = useState<NonNullable<Allergy["severity"]> | null>(null);
  const [vitalType, setVitalType] = useState<VitalType>("BLOOD_PRESSURE");
  const [ongoing, setOngoing] = useState<"yes" | "no">("yes");
  const { busy, error, run } = useAction();
  const [createMedical] = useCreateMedicalMutation();
  const create = (body: Record<string, unknown>) => createMedical({ kind, body }).unwrap();
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v });
  const opt = (k: string) => (f[k]?.trim() ? f[k].trim() : undefined);
  const today = new Date();

  const save = () =>
    run(async () => {
      const base = { familyMemberId, notes: opt("notes") };
      if (kind === "conditions") {
        if (!opt("name")) throw new Error("Enter or pick the condition.");
        await create({ ...base, name: opt("name"), diagnosedOn: opt("diagnosedOn") });
      } else if (kind === "allergies") {
        if (!category) throw new Error("Choose what kind of allergy it is.");
        if (!opt("allergen")) throw new Error("Enter what you are allergic to.");
        await create({ ...base, allergen: opt("allergen"), category, severity, reaction: opt("reaction") });
      } else if (kind === "medications") {
        if (!opt("name")) throw new Error("Enter the medicine name.");
        const start = opt("startDate");
        const end = ongoing === "no" ? opt("endDate") : undefined;
        if (start && end && end < start) throw new Error("The end date is before the start date.");
        await create({
          ...base,
          name: opt("name"),
          dosage: opt("dosage"),
          frequency: opt("frequency"),
          startDate: start,
          endDate: end,
          prescribedBy: opt("prescribedBy"),
        });
      } else {
        const value = Number(f.value);
        if (!(value > 0)) throw new Error("Enter the reading.");
        const secondary = Number(f.secondaryValue);
        if (vitalType === "BLOOD_PRESSURE" && !(secondary > 0)) throw new Error("Enter the lower number (diastolic).");
        await create({
          familyMemberId,
          type: vitalType,
          value,
          secondaryValue: vitalType === "BLOOD_PRESSURE" ? secondary : undefined,
          notes: opt("notes"),
        });
      }
      onDone();
    });

  const head = KIND_HEAD[kind];
  return (
    <QuestionCard icon={head.icon} tone={head.tone} title={head.title}>
      {kind === "conditions" ? (
        <>
          <TextField label="Condition" required value={f.name ?? ""} onChangeText={set("name")} placeholder="Type or pick one" suggestions={["Diabetes", "High BP", "Asthma", "Thyroid", "Heart disease", "Arthritis"]} />
          <DateField label="Diagnosed on" value={f.diagnosedOn ?? ""} onChange={set("diagnosedOn")} maxDate={today} minDate={new Date(1900, 0, 1)} startOnYear clearable placeholder="Optional" />
        </>
      ) : kind === "allergies" ? (
        <>
          <IconChoice label="What kind?" required options={ALLERGY_KINDS} value={category} onChange={setCategory} />
          <TextField
            label="Allergic to"
            required
            value={f.allergen ?? ""}
            onChangeText={set("allergen")}
            placeholder="Type or pick one"
            suggestions={category ? ALLERGENS[category] : undefined}
          />
          <Chips
            label="How bad is it?"
            options={[
              { value: "MILD" as const, label: "Mild" },
              { value: "MODERATE" as const, label: "Moderate" },
              { value: "SEVERE" as const, label: "Severe" },
            ]}
            value={severity}
            onChange={setSeverity}
            allowDeselect
          />
          <TextField label="What happens?" value={f.reaction ?? ""} onChangeText={set("reaction")} placeholder="Type or pick one" suggestions={["Rash", "Itching", "Swelling", "Breathing trouble", "Vomiting"]} />
        </>
      ) : kind === "medications" ? (
        <>
          <TextField label="Medicine name" required icon="medkit-outline" value={f.name ?? ""} onChangeText={set("name")} placeholder="e.g. Metformin" />
          <TextField label="Dose" value={f.dosage ?? ""} onChangeText={set("dosage")} placeholder="Type or pick" suggestions={["1 tablet", "250 mg", "500 mg", "5 ml"]} />
          <TextField label="How often" value={f.frequency ?? ""} onChangeText={set("frequency")} placeholder="Type or pick" suggestions={["Once a day", "Twice a day", "3 times a day", "At bedtime", "When needed"]} />
          <DateField label="Started on" value={f.startDate ?? ""} onChange={set("startDate")} maxDate={today} clearable placeholder="Optional" />
          <Segmented
            options={[
              { value: "yes" as const, label: "Still taking", icon: "checkmark-circle-outline" as const },
              { value: "no" as const, label: "Has an end date", icon: "calendar-outline" as const },
            ]}
            value={ongoing}
            onChange={setOngoing}
          />
          {ongoing === "no" ? <DateField label="Ends on" value={f.endDate ?? ""} onChange={set("endDate")} clearable /> : null}
          <TextField label="Prescribed by" icon="person-outline" value={f.prescribedBy ?? ""} onChangeText={set("prescribedBy")} placeholder="Doctor's name (optional)" />
        </>
      ) : (
        <>
          <IconGrid options={VITAL_OPTIONS} value={vitalType} onChange={(t) => { setVitalType(t); setF({ notes: f.notes ?? "" }); }} columns={4} />
          {vitalType === "BLOOD_PRESSURE" ? (
            <Row style={{ alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <TextField label="Upper" required value={f.value ?? ""} onChangeText={set("value")} keyboardType="number-pad" maxLength={3} placeholder="120" suffix="mmHg" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Lower" required value={f.secondaryValue ?? ""} onChangeText={set("secondaryValue")} keyboardType="number-pad" maxLength={3} placeholder="80" suffix="mmHg" />
              </View>
            </Row>
          ) : (
            <TextField label="Reading" required value={f.value ?? ""} onChangeText={set("value")} keyboardType="decimal-pad" maxLength={6} suffix={VITAL_UNITS[vitalType]} hint={VITAL_HINT[vitalType]} />
          )}
        </>
      )}
      <TextField label="Notes" value={f.notes ?? ""} onChangeText={set("notes")} placeholder="Optional" multiline />
      {error ? <ErrorBox message={error} /> : null}
      <Row>
        <Button title="Cancel" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
        <Button title="Save" icon="checkmark" onPress={save} loading={busy} style={{ flex: 1 }} />
      </Row>
    </QuestionCard>
  );
}
