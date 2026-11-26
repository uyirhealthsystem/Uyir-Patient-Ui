import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
// Only Emergency SOS, Hospital appointment and Lab & Scan are shown while we build features one by
// one; the other Book care tiles and "Call an ambulance now" come back later.
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../auth/useAuth";
import { ActiveEmergencyBanner } from "../../emergency/components/ActiveEmergencyBanner";
import { Avatar, Ionicons, Screen, SectionTitle, Tile } from "../../../ui/components";
import { colors, shadow } from "../../../ui/theme";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function HomeScreen() {
  const nav = useNavigation();
  const { me } = useAuth();
  const name = me?.profile.fullName ?? "";
  const first = name.split(" ")[0] || "there";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
      {/* Header - same shape as the provider app's screen header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            Hello, {first}
          </Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {greeting()}
            {me?.user.patientNumber ? ` · ID ${me.user.patientNumber}` : ""}
          </Text>
        </View>
        <Pressable onPress={() => nav.navigate("Tabs", { screen: "Profile" })} hitSlop={8} accessibilityLabel="Profile">
          <Avatar name={name || "U"} size={40} />
        </Pressable>
      </View>

      <Screen>
        {/* Emergency first: an emergency in progress, then the SOS hero card. */}
        <ActiveEmergencyBanner />
        <Pressable
          onPress={() => nav.navigate("EmergencySos")}
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS"
          style={({ pressed }) => [s.sos, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}
        >
          <View style={s.sosHaloOuter}>
            <View style={s.sosHaloInner}>
              <View style={s.sosIcon}>
                <Ionicons name="medkit" size={38} color={colors.danger} />
              </View>
            </View>
          </View>
          <Text style={s.sosTitle}>Emergency SOS</Text>
          <Text style={s.sosSub}>Alert a nearby hospital and get an ambulance on the way</Text>
          <View style={s.sosCta}>
            <Text style={s.sosCtaText}>Tap for help</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.danger} />
          </View>
        </Pressable>

        <SectionTitle title="Book care" />
        <View style={s.grid}>
          <Tile icon="business-outline" title="Hospital appointment" subtitle="Nearby, by name or district" onPress={() => nav.navigate("Hospitals")} />
          <Tile icon="flask-outline" title="Lab & Scan" subtitle="Tests and imaging" tone="violet" onPress={() => nav.navigate("LabScan")} />
        </View>

        <SectionTitle title="My health" />
        <View style={s.grid}>
          <Tile icon="calendar-outline" title="My bookings" onPress={() => nav.navigate("Tabs", { screen: "Bookings" })} />
          <Tile icon="document-text-outline" title="Health records" onPress={() => nav.navigate("Tabs", { screen: "Records" })} />
          <Tile icon="people-outline" title="Family" onPress={() => nav.navigate("Family")} />
          <Tile icon="id-card-outline" title="ABHA" tone="violet" onPress={() => nav.navigate("Abha")} />
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  sos: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    ...shadow,
    shadowColor: colors.danger,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  sosHaloOuter: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosHaloInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  sosTitle: { fontSize: 26, fontWeight: "900", color: colors.white, marginTop: 18, letterSpacing: 0.3 },
  sosSub: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 6, textAlign: "center", lineHeight: 20 },
  sosCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 999,
  },
  sosCtaText: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
