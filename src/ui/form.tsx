// Tap-first form controls: pick instead of type wherever we can.
// - Chips / MultiChips   : wrapping pills (single or many)
// - Segmented            : 2-3 way toggle
// - OptionCards          : vertical radio cards with icon + description
// - IconGrid             : grid of icon tiles
// - PersonPicker         : "who is this for" avatars (me + family)
// - DayStrip / TimeSlots : date + time without typing
// - OtpField             : one box per digit, auto-submits when full
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import { IconBox, Ionicons, type IconName, type Tone } from "./components";
import { FieldShell } from "./pickers";
import { colors, shadow, space } from "./theme";

type Opt<T> = { value: T; label: string; icon?: IconName };

// ── Chips ────────────────────────────────────────────────────────────────────
export function Chips<T extends string>({
  label,
  required,
  error,
  hint,
  options,
  value,
  onChange,
  allowDeselect,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  options: Opt<T>[];
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  allowDeselect?: boolean;
}) {
  return (
    <FieldShell label={label ?? ""} required={required} error={error} hint={hint}>
      <View style={s.chipRow}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Chip key={o.value} on={on} label={o.label} icon={o.icon} onPress={() => onChange(on && allowDeselect ? null : o.value)} />
          );
        })}
      </View>
    </FieldShell>
  );
}

export function MultiChips<T extends string>({
  label,
  hint,
  options,
  values,
  onChange,
}: {
  label?: string;
  hint?: string;
  options: Opt<T>[];
  values: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <FieldShell label={label ?? ""} hint={hint}>
      <View style={s.chipRow}>
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <Chip
              key={o.value}
              on={on}
              label={o.label}
              icon={o.icon}
              onPress={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
            />
          );
        })}
      </View>
    </FieldShell>
  );
}

function Chip({ on, label, icon, onPress }: { on: boolean; label: string; icon?: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.8 }]}>
      {on ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} /> : icon ? <Ionicons name={icon} size={16} color={colors.textMuted} /> : null}
      <Text style={[s.chipText, on && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

// ── Segmented ────────────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = "primary",
}: {
  options: Opt<T>[];
  value: T;
  onChange: (v: T) => void;
  tone?: "primary" | "danger";
}) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.value === value;
        const fg = on ? (tone === "danger" && o.value === options[0].value ? colors.danger : colors.primary) : colors.textMuted;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, on && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            {o.icon ? <Ionicons name={o.icon} size={17} color={fg} /> : null}
            <Text style={[s.segText, { color: fg }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Option cards ─────────────────────────────────────────────────────────────
export function OptionCards<T extends string>({
  label,
  required,
  error,
  hint,
  options,
  value,
  onChange,
  allowDeselect,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  options: (Opt<T> & { description?: string; tone?: Tone })[];
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  allowDeselect?: boolean;
}) {
  return (
    <FieldShell label={label ?? ""} required={required} error={error} hint={hint}>
      <View style={{ gap: space.sm }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(on && allowDeselect ? null : o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [s.optCard, on && s.optOn, error && !value && { borderColor: colors.danger }, pressed && { opacity: 0.85 }]}
            >
              {o.icon ? <IconBox icon={o.icon} tone={o.tone ?? "primary"} size={40} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={[s.optTitle, on && { color: colors.primary }]}>{o.label}</Text>
                {o.description ? <Text style={s.optSub}>{o.description}</Text> : null}
              </View>
              <View style={[s.radio, on && s.radioOn]}>{on ? <View style={s.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

// ── Icon grid ────────────────────────────────────────────────────────────────
export function IconGrid<T extends string>({
  label,
  required,
  error,
  options,
  value,
  onChange,
  columns = 3,
  tone = "primary",
}: {
  label?: string;
  required?: boolean;
  error?: string;
  options: (Opt<T> & { icon: IconName })[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  columns?: number;
  tone?: "primary" | "danger";
}) {
  const main = tone === "danger" ? colors.danger : colors.primary;
  const soft = tone === "danger" ? colors.dangerSoft : colors.primarySoft;
  return (
    <FieldShell label={label ?? ""} required={required} error={error}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <View key={o.value} style={{ width: `${100 / columns}%`, padding: 4 }}>
              <Pressable onPress={() => onChange(o.value)} style={[s.tile, on && { borderColor: main, backgroundColor: soft }, error && !value && { borderColor: colors.danger }]}>
                <View style={[s.tileIcon, on && { backgroundColor: main }]}>
                  <Ionicons name={o.icon} size={22} color={on ? colors.white : colors.textMuted} />
                </View>
                <Text style={[s.tileText, on && { color: main }]} numberOfLines={2}>
                  {o.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </FieldShell>
  );
}

// ── Person picker ────────────────────────────────────────────────────────────
export type PickPerson = { key: string; name: string; caption?: string };

export function PersonPicker({
  label = "Who is this for?",
  people,
  value,
  onChange,
  onAdd,
}: {
  label?: string;
  people: PickPerson[];
  value: string;
  onChange: (key: string) => void;
  /** Shows an "Add family" tile. */
  onAdd?: () => void;
}) {
  return (
    <FieldShell label={label}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
        {people.map((p) => {
          const on = p.key === value;
          const initials = p.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("");
          return (
            <Pressable key={p.key} onPress={() => onChange(p.key)} style={[s.person, on && s.optOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              {on ? (
                <View style={s.personTick}>
                  <Ionicons name="checkmark" size={11} color={colors.white} />
                </View>
              ) : null}
              <View style={[s.avatar, on && { backgroundColor: colors.primary }]}>
                <Text style={[s.avatarText, on && { color: colors.white }]}>{initials || "?"}</Text>
              </View>
              <Text style={[s.personName, on && { color: colors.primary }]} numberOfLines={1}>
                {p.key === "self" ? "Myself" : p.name.split(" ")[0]}
              </Text>
              {p.caption ? (
                <Text style={s.personCaption} numberOfLines={1}>
                  {p.caption}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
        {onAdd ? (
          <Pressable onPress={onAdd} style={[s.person, { borderStyle: "dashed" }]}>
            <View style={[s.avatar, { backgroundColor: colors.bg }]}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </View>
            <Text style={[s.personName, { color: colors.primary }]}>Add family</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </FieldShell>
  );
}

// ── Day strip ────────────────────────────────────────────────────────────────
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function DayStrip({ label = "Date", days, value, onChange }: { label?: string; days: Date[]; value: Date; onChange: (d: Date) => void }) {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);
  return (
    <FieldShell label={`${label} · ${MONTHS[value.getMonth()]} ${value.getFullYear()}`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
        {days.map((d) => {
          const on = sameDay(d, value);
          const tag = sameDay(d, today) ? "Today" : sameDay(d, tomorrow) ? "Tmrw" : WEEKDAYS[d.getDay()];
          return (
            <Pressable key={d.toISOString()} onPress={() => onChange(d)} style={[s.day, on && s.dayOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Text style={[s.dayTag, on && { color: colors.white }]}>{tag}</Text>
              <Text style={[s.dayNum, on && { color: colors.white }]}>{d.getDate()}</Text>
              <Text style={[s.dayMon, on && { color: "#DCE4FF" }]}>{MONTHS[d.getMonth()]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </FieldShell>
  );
}

// ── Time slots ───────────────────────────────────────────────────────────────
/** "14:00" -> "2:00 PM" */
export function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function TimeSlots({
  label = "Time",
  slots,
  value,
  onChange,
  error,
  emptyText = "No times left on this day. Pick another date.",
}: {
  label?: string;
  slots: string[];
  value: string | null;
  onChange: (t: string) => void;
  error?: string;
  emptyText?: string;
}) {
  const groups = [
    { name: "Morning", icon: "partly-sunny-outline" as IconName, items: slots.filter((t) => Number(t.slice(0, 2)) < 12) },
    { name: "Afternoon", icon: "sunny-outline" as IconName, items: slots.filter((t) => Number(t.slice(0, 2)) >= 12 && Number(t.slice(0, 2)) < 17) },
    { name: "Evening", icon: "moon-outline" as IconName, items: slots.filter((t) => Number(t.slice(0, 2)) >= 17) },
  ].filter((g) => g.items.length);
  return (
    <FieldShell label={label} error={error}>
      {!slots.length ? (
        <View style={s.emptySlots}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <Text style={s.optSub}>{emptyText}</Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {groups.map((g) => (
            <View key={g.name} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name={g.icon} size={14} color={colors.textMuted} />
                <Text style={s.slotGroup}>{g.name}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
                {g.items.map((t) => {
                  const on = t === value;
                  return (
                    <View key={t} style={{ width: "33.33%", padding: 4 }}>
                      <Pressable onPress={() => onChange(t)} style={[s.slot, on && s.slotOn, error && !value && { borderColor: colors.danger }]}>
                        <Text style={[s.slotText, on && { color: colors.white }]}>{time12(t)}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </FieldShell>
  );
}

// ── OTP boxes ────────────────────────────────────────────────────────────────
export function OtpField({
  label,
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  hint,
  autoFocus = true,
}: {
  label?: string;
  length?: number;
  value: string;
  onChange: (v: string) => void;
  /** Called once all digits are in (e.g. to verify straight away). */
  onComplete?: (v: string) => void;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const input = useRef<TextInputInstance>(null);
  const done = useRef("");
  useEffect(() => {
    if (value.length === length && done.current !== value) {
      done.current = value;
      onComplete?.(value);
    }
    if (value.length < length) done.current = "";
  }, [value, length, onComplete]);

  return (
    <FieldShell label={label ?? ""} error={error} hint={hint}>
      <Pressable onPress={() => input.current?.focus()} style={s.otpRow} accessibilityLabel={label ?? "Code"}>
        {Array.from({ length }, (_, i) => {
          const ch = value[i] ?? "";
          const active = i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={[s.otpBox, ch && s.otpFilled, active && s.otpActive, error && { borderColor: colors.danger }]}>
              <Text style={s.otpText}>{ch}</Text>
            </View>
          );
        })}
        <TextInput
          ref={input}
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus={autoFocus}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          caretHidden
          style={s.otpInput}
        />
      </Pressable>
    </FieldShell>
  );
}

const s = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.text },

  seg: { flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: colors.graySoft, gap: 4 },
  segItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 11 },
  segOn: { backgroundColor: colors.card, ...shadow },
  segText: { fontSize: 14, fontWeight: "800" },

  optCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  optOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  optSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17, flexShrink: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.gray, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },

  tile: { alignItems: "center", gap: 7, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, minHeight: 100, justifyContent: "center" },
  tileIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.graySoft, alignItems: "center", justifyContent: "center" },
  tileText: { fontSize: 12.5, fontWeight: "700", color: colors.text, textAlign: "center" },

  person: { width: 92, alignItems: "center", gap: 5, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  personTick: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: colors.primary },
  personName: { fontSize: 13, fontWeight: "800", color: colors.text, maxWidth: 80 },
  personCaption: { fontSize: 11, color: colors.textMuted, marginTop: -3, maxWidth: 80 },

  day: { width: 62, alignItems: "center", paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayTag: { fontSize: 11.5, fontWeight: "700", color: colors.textMuted },
  dayNum: { fontSize: 20, fontWeight: "800", color: colors.text, marginVertical: 1 },
  dayMon: { fontSize: 11, fontWeight: "600", color: colors.textMuted },

  slotGroup: { fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  slot: { height: 44, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  slotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 14, fontWeight: "800", color: colors.text },
  emptySlots: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, backgroundColor: colors.graySoft },

  otpRow: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  otpBox: { flex: 1, maxWidth: 52, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, alignItems: "center", justifyContent: "center" },
  otpFilled: { borderColor: colors.primary, backgroundColor: colors.card },
  otpActive: { borderColor: colors.primary, borderWidth: 2 },
  otpText: { fontSize: 22, fontWeight: "800", color: colors.text },
  otpInput: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: "transparent", fontSize: 1 },
});
