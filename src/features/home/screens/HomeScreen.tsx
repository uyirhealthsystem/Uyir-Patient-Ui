import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
        {/* Emergency first: an emergency in progress, then SOS and the ambulance. */}
        <ActiveEmergencyBanner />
        <Pressable onPress={() => nav.navigate("EmergencySos")} style={({ pressed }) => [s.sos, pressed && { opacity: 0.9 }]}>
          <View style={s.sosIcon}>
            <Ionicons name="medkit" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sosTitle}>Emergency SOS</Text>
            <Text style={s.sosSub}>Alert a nearby hospital, then get an ambulance</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.danger} />
        </Pressable>

        <Pressable onPress={() => nav.navigate("AmbulanceBook", { mode: "EMERGENCY" })} style={({ pressed }) => [s.amb, pressed && { opacity: 0.9 }]}>
          <Ionicons name="call" size={18} color={colors.white} />
          <Text style={s.ambText}>Call an ambulance now</Text>
        </Pressable>

        <SectionTitle title="Book care" />
        <View style={s.grid}>
          <Tile icon="medical-outline" title="Doctor" subtitle="In-person visit" onPress={() => nav.navigate("Doctors")} />
          <Tile icon="business-outline" title="Hospitals" subtitle="Search & nearby" onPress={() => nav.navigate("Hospitals")} />
          <Tile icon="car-outline" title="Ambulance" subtitle="Emergency or scheduled" tone="red" onPress={() => nav.navigate("AmbulanceBook")} />
          <Tile icon="home-outline" title="Home care" subtitle="Nurse, physio, caretaker" tone="green" onPress={() => nav.navigate("HomeCare")} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerLine,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    ...shadow,
  },
  sosIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  sosTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  sosSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  amb: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.danger,
    paddingVertical: 13,
    borderRadius: 12,
  },
  ambText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
