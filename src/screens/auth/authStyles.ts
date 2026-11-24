// Auth screen styles copied from the service provider app's Login screen so
// both apps open the same way.
import { StyleSheet } from "react-native";
import { colors } from "../../ui/theme";

export const auth = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  body: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brandBox: { alignItems: "center", marginBottom: 40 },
  brand: { fontSize: 34, fontWeight: "800", color: colors.primary },
  brandSub: { marginTop: 3, color: "#555" },
  title: { fontSize: 28, fontWeight: "700", color: "#111827" },
  subtitle: { marginTop: 8, color: "#6B7280", fontSize: 14.5, lineHeight: 20 },
  input: {
    height: 60,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 18,
    backgroundColor: colors.white,
    color: "#111827",
    fontSize: 16,
  },
  linkRight: { alignSelf: "flex-end", marginTop: 10 },
  link: { color: colors.primary, fontWeight: "600" },
  primary: { marginTop: 20, backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: "center" },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  error: { marginTop: 10, color: "#DC2626" },
  notice: { marginTop: 10, color: "#067647" },
  footerLink: { alignItems: "center", marginTop: 24 },
  footerText: { color: "#6B7280" },
  footerStrong: { color: colors.primary, fontWeight: "700" },
});
