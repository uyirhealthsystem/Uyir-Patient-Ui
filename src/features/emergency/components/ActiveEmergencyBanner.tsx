import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "../../../ui/components";
import { colors } from "../../../ui/theme";
import { useEmergencyHistoryQuery } from "../api";
import { ACTIVE_EMERGENCY, type EmergencyBooking } from "../types";

const TEXT: Record<string, string> = {
  REQUESTED: "Waiting for the hospital to accept",
  ACCEPTED: "Hospital is ready for you",
};

/** The patient's newest emergency still in progress (REQUESTED or ACCEPTED), polled every 15 s. */
export function useActiveEmergency(): EmergencyBooking | undefined {
  const { active } = useEmergencyHistoryQuery(undefined, {
    pollingInterval: 15_000,
    selectFromResult: ({ data }) => ({
      active: data
        ?.filter((b) => ACTIVE_EMERGENCY.includes(b.status))
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0],
    }),
  });
  return active;
}

/** Shown at the top of Home and SOS while an emergency is in progress. Tap to open it. */
export function ActiveEmergencyBanner() {
  const nav = useNavigation();
  const active = useActiveEmergency();
  if (!active) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => nav.navigate("EmergencyStatus", { bookingId: active.id, hospitalId: active.hospitalId })}
      style={({ pressed }) => [s.box, pressed && { opacity: 0.9 }]}
    >
      <View style={s.dot}>
        <Ionicons name="pulse" size={20} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Emergency in progress</Text>
        <Text style={s.sub} numberOfLines={2}>
          {active.emergencyType} · {TEXT[active.status] ?? active.status}
        </Text>
      </View>
      <Text style={s.open}>Open</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.white} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.danger, borderRadius: 14, padding: 12 },
  dot: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  title: { color: colors.white, fontSize: 15, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.9)", fontSize: 12.5, marginTop: 1 },
  open: { color: colors.white, fontWeight: "700", fontSize: 13 },
});
