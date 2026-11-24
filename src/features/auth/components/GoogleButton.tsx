import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../useAuth";
import { googleUnavailableReason } from "../google";
import { useAction } from "../../../lib/hooks";
import { Ionicons } from "../../../ui/components";
import { colors } from "../../../ui/theme";

/** "Continue with Google" - signs in, or creates the patient account on first use. */
export function GoogleButton() {
  const { loginWithGoogle } = useAuth();
  const { busy, error, setError, run } = useAction();

  const onPress = () => {
    const reason = googleUnavailableReason();
    if (reason) return setError(reason);
    run(() => loginWithGoogle());
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        onPress={onPress}
        disabled={busy}
        style={({ pressed }) => [s.button, (pressed || busy) && { opacity: 0.6 }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <Text style={s.text}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function OrDivider() {
  return (
    <View style={s.divider}>
      <View style={s.line} />
      <Text style={s.or}>or</Text>
      <View style={s.line} />
    </View>
  );
}

const s = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.white,
  },
  text: { fontWeight: "600", fontSize: 15, color: "#111827" },
  error: { marginTop: 10, color: "#DC2626" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  or: { marginHorizontal: 12, color: "#777" },
});
