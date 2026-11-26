import { useLayoutEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCareBookingsQuery, useCareServicesQuery } from "../api";
import type { CareBooking, CareService, CareType } from "../types";
import { dateTime, money, statusTone } from "../../../lib/format";
import { useScreenQuery } from "../../../lib/hooks";
import type { AppScreen } from "../../../navigation/types";
import { Badge, Empty, ErrorBox, Ionicons, Loading, Screen, SectionTitle, type IconName } from "../../../ui/components";
import { Segmented } from "../../../ui/form";
import { colors, shadow } from "../../../ui/theme";

const CARE: Record<CareType, { label: string; title: string; heroTitle: string; heroIcon: IconName; icon: IconName; blurb: string }> = {
  NURSE: {
    label: "Nursing",
    title: "Home nurse",
    heroTitle: "A nurse at your home",
    heroIcon: "medkit",
    icon: "medkit-outline",
    blurb: "Registered nurses for injections, drips, wound and catheter care.",
  },
  PHYSIO: {
    label: "Physio",
    title: "Physiotherapy",
    heroTitle: "Physiotherapy at home",
    heroIcon: "body",
    icon: "body-outline",
    blurb: "Physiotherapists for recovery, mobility and pain relief at home.",
  },
  CARETAKER: {
    label: "Caretaker",
    title: "Caretaker",
    heroTitle: "A caretaker at your home",
    heroIcon: "people",
    icon: "people-outline",
    blurb: "Trained caretakers for day-to-day help and elderly care.",
  },
};
const ACTIVE = ["PENDING", "ACCEPTED", "CONFIRMED", "PAID", "IN_PROGRESS"];

export default function HomeCareScreen({ navigation, route }: AppScreen<"HomeCare">) {
  // Opened from a Home tile (Home nurse / Physiotherapy / Caretaker): show only
  // that type, no tabs. Opened without one (e.g. from Bookings): show the tabs.
  const fixed = route.params?.careType;
  const [picked, setPicked] = useState<CareType>("NURSE");
  const careType = fixed ?? picked;
  const services = useScreenQuery(useCareServicesQuery(careType));
  // Optional: if the bookings list fails, the catalogue still works.
  const { data: bookings } = useCareBookingsQuery();
  const active = (bookings ?? []).filter((b) => ACTIVE.includes(b.status) && (!fixed || b.careType === fixed)).slice(0, 3);
  const care = CARE[careType];

  useLayoutEffect(() => {
    navigation.setOptions({ title: fixed ? CARE[fixed].title : "Home care" });
  }, [navigation, fixed]);

  return (
    <Screen refreshing={services.refreshing} onRefresh={services.refresh}>
      {/* ── Intro ────────────────────────────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name={fixed ? care.heroIcon : "home"} size={26} color={colors.success} />
        </View>
        <Text style={s.heroTitle}>{fixed ? care.heroTitle : "Care at home"}</Text>
        <Text style={s.heroSub}>{fixed ? `${care.blurb} They visit you or a family member at home.` : "Book a trained nurse, physiotherapist or caretaker to visit you or a family member."}</Text>
        <View style={s.trust}>
          <Trust icon="shield-checkmark-outline" text="Verified professionals" />
          <Trust icon="wallet-outline" text="Pay after they confirm" />
          <Trust icon="key-outline" text="Visit OTP for safety" />
        </View>
      </View>

      {/* ── Visits in progress ───────────────────────────────────────── */}
      {active.length ? (
        <>
          <SectionTitle title="Your visits" />
          {active.map((b) => (
            <VisitRow key={b.id} b={b} onPress={() => navigation.navigate("HomeCareDetail", { id: b.id })} />
          ))}
        </>
      ) : null}

      {/* ── Catalogue ────────────────────────────────────────────────── */}
      <SectionTitle title={fixed ? `${care.title} services` : "Choose a service"} />
      {fixed ? null : (
        <>
          <Segmented
            options={(Object.keys(CARE) as CareType[]).map((c) => ({ value: c, label: CARE[c].label, icon: CARE[c].icon }))}
            value={careType}
            onChange={setPicked}
          />
          <Text style={s.blurb}>{care.blurb}</Text>
        </>
      )}

      {services.loading ? <Loading /> : null}
      {services.error ? <ErrorBox message={services.error} onRetry={services.refresh} /> : null}
      {services.data && services.data.length === 0 ? (
        <Empty icon={care.icon} title={`No ${care.label.toLowerCase()} services yet`} subtitle="Check back soon, or try another type." />
      ) : null}
      {services.data?.map((svc) => (
        <ServiceCard key={svc.id} svc={svc} icon={care.icon} onPress={() => navigation.navigate("HomeCareBook", { serviceId: svc.id })} />
      ))}
    </Screen>
  );
}

function Trust({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={s.trustItem}>
      <Ionicons name={icon} size={16} color={colors.success} />
      <Text style={s.trustText}>{text}</Text>
    </View>
  );
}

function ServiceCard({ svc, icon, onPress }: { svc: CareService; icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={`Book ${svc.name}`}>
      <View style={s.cardTop}>
        <View style={s.svcIcon}>
          <Ionicons name={icon} size={22} color={colors.success} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.svcName}>{svc.name}</Text>
          {svc.description ? (
            <Text style={s.svcDesc} numberOfLines={2}>
              {svc.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={s.cardBottom}>
        <View style={s.meta}>
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <Text style={s.metaText}>{svc.durationMinutes >= 60 && svc.durationMinutes % 60 === 0 ? `${svc.durationMinutes / 60} hr` : `${svc.durationMinutes} min`}</Text>
        </View>
        <Text style={s.price}>{money(svc.price)}</Text>
        <View style={{ flex: 1 }} />
        <View style={s.bookPill}>
          <Text style={s.bookText}>Book</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.white} />
        </View>
      </View>
    </Pressable>
  );
}

function VisitRow({ b, onPress }: { b: CareBooking; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.visit, pressed && { opacity: 0.85 }]}>
      <Ionicons name={CARE[b.careType]?.icon ?? "home-outline"} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={s.visitName} numberOfLines={1}>
          {b.service.name}
        </Text>
        <Text style={s.visitWhen}>{dateTime(b.scheduledAt)}</Text>
      </View>
      <Badge label={b.status} tone={statusTone(b.status)} />
      <Ionicons name="chevron-forward" size={18} color={colors.gray} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.successSoft, borderRadius: 20, padding: 18, gap: 8, borderWidth: 1, borderColor: "#C9EBDD" },
  heroIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  heroSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  trust: { gap: 6, marginTop: 6 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  trustText: { fontSize: 13.5, fontWeight: "600", color: colors.text },
  blurb: { fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12, ...shadow },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  svcIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" },
  svcName: { fontSize: 16, fontWeight: "800", color: colors.text },
  svcDesc: { fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  price: { fontSize: 16, fontWeight: "800", color: colors.text },
  bookPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  bookText: { color: colors.white, fontWeight: "700", fontSize: 13.5 },
  visit: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  visitName: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  visitWhen: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
});
