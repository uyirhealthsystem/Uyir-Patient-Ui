// Shared UI kit, styled after the Uyir service provider app (hospital kit):
// Ionicons, white bordered cards, soft-tinted icon boxes, pill badges.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius, shadow, space } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export { Ionicons };

// ── Tones ────────────────────────────────────────────────────────────────────
const tones = {
  primary: [colors.primarySoft, colors.primary],
  blue: [colors.infoSoft, colors.info],
  green: [colors.successSoft, colors.success],
  red: [colors.dangerSoft, colors.danger],
  amber: [colors.warningSoft, colors.warning],
  violet: [colors.violetSoft, colors.violet],
  gray: [colors.graySoft, colors.textMuted],
} as const;
export type Tone = keyof typeof tones;
export const toneColors = (t: Tone) => ({ bg: tones[t][0], fg: tones[t][1] });

// ── Layout ───────────────────────────────────────────────────────────────────
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? { padding: space.lg, gap: space.md } : null;
  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[pad, { paddingBottom: footer ? space.lg : space.xxl * 2 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
      {/* Keep the footer button above the phone's navigation bar. */}
      {footer ? <View style={[styles.footer, { paddingBottom: space.md + insets.bottom }]}>{footer}</View> : null}
    </View>
  );
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A titled white panel grouping related rows. */
export function Panel({ title, icon, right, children }: { title?: string; icon?: IconName; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={[styles.card, { padding: 0, gap: 0 }]}>
      {title ? (
        <View style={styles.panelHead}>
          {icon ? (
            <View style={styles.panelIcon}>
              <Ionicons name={icon} size={16} color={colors.primary} />
            </View>
          ) : null}
          <Text style={styles.panelTitle}>{title}</Text>
          <View style={{ flex: 1 }} />
          {right}
        </View>
      ) : null}
      <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: space.sm }}>{children}</View>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Controls ─────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost" | "outline" | "dangerOutline";
const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  success: { bg: colors.success, fg: colors.white, border: colors.success },
  danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
  secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
  outline: { bg: colors.white, fg: colors.primary, border: colors.border },
  dangerOutline: { bg: colors.white, fg: colors.danger, border: colors.danger },
  ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} style={{ marginRight: 7 }} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.focus}
        style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  format = (o) => humanize(o),
}: {
  label?: string;
  options: readonly T[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  format?: (o: T) => string;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map((o) => {
          const on = o === value;
          return (
            <Pressable key={o} onPress={() => onChange(o)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && { color: colors.white }]}>{format(o)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Typography ───────────────────────────────────────────────────────────────
export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.body, muted && { color: colors.textMuted }, style]}>{children}</Text>;
}
export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space.sm }, style]}>{children}</View>;
}
export function KV({ k, v }: { k: string; v?: ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

// ── Display ──────────────────────────────────────────────────────────────────
export function Badge({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  const { bg, fg } = toneColors(tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{humanize(label)}</Text>
    </View>
  );
}

/** Rounded square with a tinted background and an icon (tiles, menu rows, stats). */
export function IconBox({ icon, tone = "primary", size = 38 }: { icon: IconName; tone?: Tone; size?: number }) {
  const { bg, fg } = toneColors(tone);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.29, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={size * 0.55} color={fg} />
    </View>
  );
}

/** Settings-style navigation row. */
export function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  tone = "primary",
  right,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: Tone;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menu, !last && styles.menuLine, pressed && { opacity: 0.7 }]}>
      <IconBox icon={icon} tone={tone} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.menuSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      <Ionicons name="chevron-forward" size={18} color={colors.gray} />
    </Pressable>
  );
}

/** Grid tile: icon box + label (+ optional subtitle). Use inside a wrapping row. */
export function Tile({ icon, title, subtitle, onPress, tone = "primary" }: { icon: IconName; title: string; subtitle?: string; onPress: () => void; tone?: Tone }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <IconBox icon={icon} tone={tone} />
      <View style={{ flex: 1 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.tileSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function Stat({ icon, value, label, tone = "primary" }: { icon: IconName; value: string | number; label: string; tone?: Tone }) {
  return (
    <View style={styles.stat}>
      <IconBox icon={icon} tone={tone} size={30} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials =
    name
      .replace(/^dr\.?\s*/i, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Body muted>{label}</Body> : null}
    </View>
  );
}

function BannerBox({ tone, icon, children, action }: { tone: Tone; icon: IconName; children: ReactNode; action?: { label: string; onPress: () => void } }) {
  const { bg, fg } = toneColors(tone);
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={{ color: fg, flex: 1, fontSize: 13.5, lineHeight: 19, fontWeight: "600" }}>{children}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={{ color: fg, fontWeight: "800", fontSize: 13 }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <BannerBox tone="red" icon="alert-circle" action={onRetry ? { label: "Retry", onPress: onRetry } : undefined}>
      {message}
    </BannerBox>
  );
}

const NOTICE_ICONS: Record<Tone, IconName> = {
  primary: "information-circle",
  blue: "information-circle",
  green: "checkmark-circle",
  red: "alert-circle",
  amber: "time",
  violet: "information-circle",
  gray: "information-circle",
};
export function Notice({ children, tone = "blue", icon }: { children: ReactNode; tone?: Tone; icon?: IconName }) {
  return (
    <BannerBox tone={tone} icon={icon ?? NOTICE_ICONS[tone]}>
      {children}
    </BannerBox>
  );
}

export function Empty({ title, subtitle, icon = "file-tray-outline" }: { title: string; subtitle?: string; icon?: IconName }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={34} color={colors.gray} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptyHint}>{subtitle}</Text> : null}
    </View>
  );
}

export function humanize(s: string) {
  if (!/^[A-Z0-9_]+$/.test(s)) return s;
  return s
    .toLowerCase()
    .split("_")
    .map((w) => (["bls", "als", "icu", "otp"].includes(w) ? w.toUpperCase() : w[0]?.toUpperCase() + w.slice(1)))
    .join(" ");
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  footer: { paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  panelIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  panelTitle: { fontSize: 14.5, fontWeight: "800", color: colors.text },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.sm },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  link: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  button: {
    flexDirection: "row",
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    paddingVertical: 12,
  },
  buttonSmall: { minHeight: 36, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  buttonText: { fontSize: font.md, fontWeight: "700" },
  label: { fontSize: font.sm, fontWeight: "600", color: colors.textMuted },
  hint: { fontSize: 12.5, color: colors.textMuted },
  errorText: { fontSize: font.sm, color: colors.danger },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: font.md,
    color: colors.text,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.sm, color: colors.textMuted, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, lineHeight: 30 },
  h2: { fontSize: 15.5, fontWeight: "800", color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: space.md, paddingVertical: 2 },
  kvKey: { fontSize: font.sm, color: colors.textMuted },
  kvVal: { fontSize: font.sm, color: colors.text, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  menu: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  menuLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  menuTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  menuSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  tile: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadow,
  },
  tileTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  tileSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  stat: { flex: 1, minWidth: 0, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, ...shadow },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl, backgroundColor: colors.bg },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md },
  empty: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptyHint: { marginTop: 4, fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
});
