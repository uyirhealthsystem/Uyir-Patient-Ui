import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useHospitalQuery, useSearchDoctorsQuery } from "../api";
import { addressCoords, type Doctor, type Hospital } from "../types";
import { hospitalAddress, money } from "../../../lib/format";
import { useScreenQuery } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Avatar, Badge, Button, Empty, ErrorBox, IconBox, Ionicons, Loading, Panel, Screen, SectionTitle, Stat, humanize, type IconName } from "../../../ui/components";
import { TextField } from "../../../ui/pickers";
import { colors, shadow } from "../../../ui/theme";

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

export default function HospitalDetailScreen({ navigation, route }: AppScreen<"HospitalDetail">) {
  const { id } = route.params;
  const hospital = useScreenQuery(useHospitalQuery(id));
  const doctorsQ = useScreenQuery(useSearchDoctorsQuery({ hospitalId: id }));
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [doctorQuery, setDoctorQuery] = useState("");

  const doctors = doctorsQ.data?.content ?? [];
  const specialties = useMemo(() => [...new Set(doctors.flatMap((d) => d.specialties ?? []))].sort(), [doctors]);
  const q = doctorQuery.trim().toLowerCase();
  const shown = doctors.filter(
    (d) =>
      (!specialty || d.specialties?.includes(specialty)) &&
      (!q || d.name.toLowerCase().includes(q) || d.specialties?.some((sp) => sp.toLowerCase().includes(q))),
  );

  const loading = hospital.loading || doctorsQ.loading;
  const error = hospital.error ?? doctorsQ.error;
  const refresh = () => Promise.all([hospital.refresh(), doctorsQ.refresh()]);

  if (loading) return <Loading />;
  if (error || !hospital.data) return <Screen><ErrorBox message={error ?? "Hospital not found"} onRetry={refresh} /></Screen>;
  const h = hospital.data;
  const c = h.contactDetails ?? ({} as Hospital["contactDetails"]);
  const coords = addressCoords(h.address);
  const beds = h.facilities?.bedCapacity ?? {};
  const totalBeds = Object.values(beds).reduce((a, b) => a + (b || 0), 0);
  const departments = h.facilities?.specialtyDepartments ?? [];
  const book = (d: Doctor) => navigation.navigate("BookAppointment", { hospitalId: id, doctorId: d.id });

  return (
    <Screen refreshing={hospital.refreshing || doctorsQ.refreshing} onRefresh={refresh}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <IconBox icon="business" size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.name}>{h.hospitalName}</Text>
            <Text style={s.kind}>{[humanize(h.hospitalType), h.ownershipType ? humanize(h.ownershipType) : null].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>
        <View style={s.addrRow}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={s.addr}>{hospitalAddress(h.address)}</Text>
        </View>
        <View style={s.badges}>
          {h.emergencyServices?.handlesEmergencies ? <Badge label="24x7 Emergency" tone="red" /> : null}
          {h.emergencyServices?.ambulance24x7Available ? <Badge label="24x7 Ambulance" tone="amber" /> : null}
          {h.operations?.dedicatedPharmacyAvailable ? <Badge label="Pharmacy" tone="green" /> : null}
          {h.operations?.empanelledInsuranceCompanies?.length ? <Badge label="Insurance accepted" tone="blue" /> : null}
        </View>

        <View style={s.actions}>
          {c.phone ? <Action icon="call" label="Call" onPress={() => Linking.openURL(tel(c.phone))} /> : null}
          {coords ? (
            <Action
              icon="navigate"
              label="Directions"
              onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`)}
            />
          ) : null}
          {c.website ? <Action icon="globe-outline" label="Website" onPress={() => Linking.openURL(c.website!)} /> : null}
          {c.emergencyHotline ? <Action icon="alert-circle" label="Emergency" tone="red" onPress={() => Linking.openURL(tel(c.emergencyHotline!))} /> : null}
        </View>
      </View>

      {/* ── At a glance ────────────────────────────────────────────────── */}
      <View style={s.stats}>
        <Stat icon="people-outline" value={doctors.length} label="Doctors" />
        <Stat icon="grid-outline" value={departments.length} label="Depts" tone="violet" />
        {totalBeds ? <Stat icon="bed-outline" value={totalBeds} label="Beds" tone="green" /> : null}
        {beds.icu ? <Stat icon="pulse-outline" value={beds.icu} label="ICU beds" tone="red" /> : null}
      </View>

      {/* ── Doctors (the reason the patient is here) ──────────────────── */}
      <SectionTitle title="Book with a doctor" />
      {doctors.length > 1 ? (
        <>
          <TextField label="Find a doctor" icon="search-outline" value={doctorQuery} onChangeText={setDoctorQuery} placeholder="Doctor name or specialty" returnKeyType="search" />
          {specialties.length ? (
            <View style={s.chips}>
              <Chip label={`All (${doctors.length})`} on={!specialty} onPress={() => setSpecialty(null)} />
              {specialties.map((sp) => (
                <Chip
                  key={sp}
                  label={`${sp} (${doctors.filter((d) => d.specialties?.includes(sp)).length})`}
                  on={specialty === sp}
                  onPress={() => setSpecialty(specialty === sp ? null : sp)}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      {doctors.length === 0 ? <Empty icon="medkit-outline" title="No doctors listed yet" subtitle="Call the hospital to book a visit." /> : null}
      {doctors.length > 0 && shown.length === 0 ? (
        <Empty
          icon="search-outline"
          title="No doctor matches"
          subtitle="Try another name or specialty."
        />
      ) : null}
      {shown.map((d) => (
        <DoctorCard key={d.id} doctor={d} fee={d.hospitalAssociations?.find((a) => a.hospitalId === id)?.consultationFee ?? d.consultationFee} onBook={() => book(d)} />
      ))}

      {/* ── Departments ────────────────────────────────────────────────── */}
      {departments.length ? (
        <Panel title="Departments" icon="grid-outline">
          <View style={s.chips}>
            {departments.map((dep) => (
              <View key={dep} style={s.tag}>
                <Text style={s.tagText}>{dep}</Text>
              </View>
            ))}
          </View>
        </Panel>
      ) : null}

      {/* ── Facilities ─────────────────────────────────────────────────── */}
      <Facilities h={h} beds={beds} />

      {/* ── Insurance ──────────────────────────────────────────────────── */}
      {h.operations?.empanelledInsuranceCompanies?.length ? (
        <Panel title="Insurance accepted" icon="shield-checkmark-outline">
          <View style={s.chips}>
            {h.operations.empanelledInsuranceCompanies.map((ins) => (
              <View key={ins} style={s.tag}>
                <Text style={s.tagText}>{ins}</Text>
              </View>
            ))}
          </View>
        </Panel>
      ) : null}

      {/* ── Contact ────────────────────────────────────────────────────── */}
      <Panel title="Contact" icon="call-outline">
        <ContactRow icon="call-outline" label="Phone" value={c.phone} onPress={c.phone ? () => Linking.openURL(tel(c.phone)) : undefined} />
        <ContactRow icon="call-outline" label="Alternate phone" value={c.alternatePhone} onPress={c.alternatePhone ? () => Linking.openURL(tel(c.alternatePhone!)) : undefined} />
        <ContactRow icon="alert-circle-outline" label="Emergency hotline" value={c.emergencyHotline} onPress={c.emergencyHotline ? () => Linking.openURL(tel(c.emergencyHotline!)) : undefined} />
        <ContactRow icon="mail-outline" label="Email" value={c.email} onPress={c.email ? () => Linking.openURL(`mailto:${c.email}`) : undefined} />
        <ContactRow icon="globe-outline" label="Website" value={c.website} onPress={c.website ? () => Linking.openURL(c.website!) : undefined} />
      </Panel>
    </Screen>
  );
}

function Action({ icon, label, onPress, tone = "primary" }: { icon: IconName; label: string; onPress: () => void; tone?: "primary" | "red" }) {
  const fg = tone === "red" ? colors.danger : colors.primary;
  const bg = tone === "red" ? colors.dangerSoft : colors.primarySoft;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.action, { backgroundColor: bg }, pressed && { opacity: 0.75 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={[s.actionText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function DoctorCard({ doctor: d, fee, onBook }: { doctor: Doctor; fee?: number; onBook: () => void }) {
  return (
    <View style={s.doc}>
      <View style={s.docTop}>
        <Avatar name={d.name} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.docName}>{d.name}</Text>
          {d.specialties?.length ? <Text style={s.docSpec}>{d.specialties.join(", ")}</Text> : null}
          {d.qualifications?.length ? <Text style={s.docQual}>{d.qualifications.join(", ")}</Text> : null}
        </View>
      </View>
      <View style={s.docMeta}>
        {d.yearsOfExperience != null ? <Meta icon="ribbon-outline" text={`${d.yearsOfExperience} yrs experience`} /> : null}
        {fee != null ? <Meta icon="wallet-outline" text={`${money(fee)} consultation`} /> : null}
      </View>
      <Button title="Book appointment" icon="calendar-outline" onPress={onBook} />
    </View>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={s.meta}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={s.metaText}>{text}</Text>
    </View>
  );
}

function Facilities({ h, beds }: { h: Hospital; beds: Record<string, number> }) {
  const scans = h.operations?.scansAvailable;
  const items: { icon: IconName; label: string }[] = [];
  if (h.facilities?.diagnosticUnits?.lab) items.push({ icon: "flask-outline", label: "Laboratory" });
  if (h.facilities?.diagnosticUnits?.scanCentre) items.push({ icon: "scan-outline", label: "Scan centre" });
  if (h.facilities?.diagnosticUnits?.pathology) items.push({ icon: "beaker-outline", label: "Pathology" });
  const scanNames = [scans?.xray && "X-ray", scans?.usg && "Ultrasound", scans?.ct && "CT", scans?.mri && "MRI", ...(scans?.other ?? [])].filter(Boolean) as string[];
  if (scanNames.length) items.push({ icon: "body-outline", label: `Scans: ${scanNames.join(", ")}` });
  if (h.operations?.dedicatedPharmacyAvailable) items.push({ icon: "medkit-outline", label: "In-house pharmacy" });
  if (h.surgicalNetwork?.operationTheatreCount) items.push({ icon: "cut-outline", label: `${h.surgicalNetwork.operationTheatreCount} operation theatres` });
  const bedText = Object.entries(beds)
    .filter(([, n]) => n)
    .map(([k, n]) => `${n} ${k.length <= 4 ? k.toUpperCase() : humanize(k).toLowerCase()}`)
    .join(" · ");
  if (bedText) items.push({ icon: "bed-outline", label: `Beds: ${bedText}` });
  if (h.emergencyServices?.ambulanceAvailable)
    items.push({ icon: "car-outline", label: `Ambulance${h.emergencyServices.ambulanceTypes?.length ? `: ${h.emergencyServices.ambulanceTypes.map((t) => (t.length <= 4 ? t : humanize(t))).join(", ")}` : ""}` });
  if (!items.length) return null;
  return (
    <Panel title="Facilities & services" icon="checkmark-done-outline">
      {items.map((it) => (
        <View key={it.label} style={s.fac}>
          <Ionicons name={it.icon} size={18} color={colors.success} />
          <Text style={s.facText}>{it.label}</Text>
        </View>
      ))}
    </Panel>
  );
}

function ContactRow({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress?: () => void }) {
  if (!value) return null;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.contact, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={s.contactLabel}>{label}</Text>
        <Text style={[s.contactValue, onPress && { color: colors.primary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12, ...shadow },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  kind: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  addrRow: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  addr: { flex: 1, fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  action: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 12 },
  actionText: { fontSize: 12, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.graySoft },
  tagText: { fontSize: 13, fontWeight: "600", color: colors.text },
  doc: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12, ...shadow },
  docTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  docName: { fontSize: 16.5, fontWeight: "800", color: colors.text },
  docSpec: { fontSize: 13.5, fontWeight: "700", color: colors.primary },
  docQual: { fontSize: 12.5, color: colors.textMuted },
  docMeta: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  fac: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 },
  facText: { flex: 1, fontSize: 14, color: colors.text },
  contact: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  contactLabel: { fontSize: 12, color: colors.textMuted },
  contactValue: { fontSize: 14.5, fontWeight: "600", color: colors.text },
});
