// Friendly input controls: date of birth picker, searchable select, phone with
// +91 prefix, icon choice buttons and a consent checkbox. Styled like the
// shared kit (and the service provider app's DobPicker).
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconBox, Ionicons, styles as kit, type IconName } from "./components";
import { colors, radius, shadow, space } from "./theme";

// ── Field shell ──────────────────────────────────────────────────────────────
export function FieldShell({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={kit.label}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? (
        <View style={s.errRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={kit.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={kit.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * Text input with label, required marker and inline error.
 * `suffix` shows a unit (e.g. "kg"); `suggestions` are tap-to-fill chips under the box.
 */
export function TextField({
  label,
  required,
  error,
  hint,
  icon,
  suffix,
  suggestions,
  right,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: IconName;
  suffix?: string;
  suggestions?: string[];
  /** Replaces the clear button (e.g. a show/hide toggle). */
  right?: React.ReactNode;
}) {
  const clearable = !!props.value && !props.multiline && props.editable !== false && !suffix && !right;
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <View style={[s.inputBox, error && s.inputError, props.multiline && { alignItems: "flex-start" }]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.gray} style={props.multiline ? { marginTop: 13 } : undefined} /> : null}
        <TextInput
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.focus}
          style={[s.inputText, props.multiline && { minHeight: 72, textAlignVertical: "top", paddingTop: 12 }]}
          {...props}
        />
        {clearable ? (
          <Pressable onPress={() => props.onChangeText?.("")} hitSlop={10} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </Pressable>
        ) : null}
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
        {right}
      </View>
      {suggestions?.length ? (
        <View style={s.suggestRow}>
          {suggestions.map((t) => {
            const on = props.value === t;
            return (
              <Pressable key={t} onPress={() => props.onChangeText?.(on ? "" : t)} style={[s.suggest, on && s.suggestOn]}>
                {on ? <Ionicons name="checkmark" size={13} color={colors.primary} /> : null}
                <Text style={[s.suggestText, on && { color: colors.primary }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </FieldShell>
  );
}

/** Password / secret with a show-hide eye. */
export function SecretField(props: React.ComponentProps<typeof TextField>) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!shown}
      right={
        <Pressable onPress={() => setShown(!shown)} hitSlop={10} accessibilityLabel={shown ? "Hide" : "Show"}>
          <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray} />
        </Pressable>
      }
    />
  );
}

/** Indian mobile number: fixed +91 prefix, 10 digits. */
export function PhoneField({ label = "Mobile number", value, onChange, error, required, hint }: { label?: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean; hint?: string }) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <View style={[s.inputBox, error && s.inputError, { paddingLeft: 0 }]}>
        <View style={s.prefix}>
          <Text style={s.prefixText}>+91</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(-10))}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="98765 43210"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.focus}
          autoComplete="tel"
          style={s.inputText}
        />
      </View>
    </FieldShell>
  );
}

// ── Choice buttons ───────────────────────────────────────────────────────────
export function IconChoice<T extends string>({
  label,
  required,
  error,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string;
  options: { value: T; label: string; icon: IconName }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.choice, on && s.choiceOn]}>
              {on ? (
                <View style={s.tick}>
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                </View>
              ) : null}
              <View style={[s.choiceIcon, on && { backgroundColor: colors.primary }]}>
                <Ionicons name={o.icon} size={24} color={on ? colors.white : colors.textMuted} />
              </View>
              <Text style={[s.choiceText, on && { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

/** Wrapping grid of small option buttons (e.g. blood groups). */
export function GridChoice<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  columns = 4,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <View key={o.value} style={{ width: `${100 / columns}%`, padding: 4 }}>
              <Pressable onPress={() => onChange(o.value)} style={[s.gridCell, on && s.choiceOn]}>
                <Text style={[s.gridText, on && { color: colors.primary }]}>{o.label}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </FieldShell>
  );
}

// ── Date of birth (native calendar) ─────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

export function ageOf(isoDate: string): number | null {
  const d = fromIso(isoDate);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

export function formatDob(isoDate: string) {
  const d = fromIso(isoDate);
  if (!d) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Looks like an input; opens the phone's calendar. Value is "YYYY-MM-DD" or "".
 * `showAge` adds an age pill (birthdays); `clearable` adds an x for optional dates.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  required,
  hint,
  minDate,
  maxDate,
  placeholder = "Tap to pick a date",
  startOnYear,
  showAge,
  defaultDate,
  clearable,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  /** Open on the year list first (for dates years back). */
  startOnYear?: boolean;
  showAge?: boolean;
  defaultDate?: Date;
  clearable?: boolean;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = fromIso(value) ?? defaultDate ?? new Date();
  const age = showAge && value ? ageOf(value) : null;

  if (Platform.OS === "web") {
    return (
      <FieldShell label={label} required={required} error={error} hint={hint}>
        <View style={[s.inputBox, error && s.inputError]}>
          <Ionicons name="calendar-outline" size={20} color={value ? colors.primary : colors.gray} />
          <input
            type="date"
            value={value}
            min={minDate ? toIso(minDate) : undefined}
            max={maxDate ? toIso(maxDate) : undefined}
            onChange={(e) => onChange(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              fontFamily: "inherit",
              color: value ? colors.text : colors.placeholder,
              paddingTop: 12,
              paddingBottom: 12,
              cursor: "pointer",
            }}
          />
          {age != null ? (
            <View style={s.agePill}>
              <Text style={s.agePillText}>{age} yrs</Text>
            </View>
          ) : value && clearable ? (
            <Pressable onPress={() => onChange("")} hitSlop={10} accessibilityLabel={`Clear ${label}`}>
              <Ionicons name="close-circle" size={18} color={colors.placeholder} />
            </Pressable>
          ) : null}
        </View>
      </FieldShell>
    );
  }

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        display: "calendar",
        startOnYearSelection: !!startOnYear && !value,
        maximumDate: maxDate,
        minimumDate: minDate,
        positiveButton: { label: "Done", textColor: colors.primary },
        negativeButton: { label: "Cancel", textColor: colors.textMuted },
        onValueChange: (_event, date) => {
          if (date) onChange(toIso(date));
        },
      });
    } else {
      setIosOpen(true);
    }
  };

  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <Pressable onPress={open} style={[s.inputBox, error && s.inputError]} accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`}>
        <Ionicons name="calendar-outline" size={20} color={value ? colors.primary : colors.gray} />
        <Text style={[s.inputText, s.selectText, !value && { color: colors.placeholder }]}>{value ? formatDob(value) : placeholder}</Text>
        {age != null ? (
          <View style={s.agePill}>
            <Text style={s.agePillText}>{age} yrs</Text>
          </View>
        ) : value && clearable ? (
          <Pressable onPress={() => onChange("")} hitSlop={10} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.gray} />
        )}
      </Pressable>

      {Platform.OS === "ios" ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <View style={s.backdrop}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{label}</Text>
              <DateTimePicker
                value={current}
                mode="date"
                display="inline"
                maximumDate={maxDate}
                minimumDate={minDate}
                accentColor={colors.primary}
                onValueChange={(_e, date) => {
                  if (date) onChange(toIso(date));
                }}
              />
              <Button title="Done" onPress={() => setIosOpen(false)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </FieldShell>
  );
}

/** Birthday: opens on the year list, can't be in the future, shows the age. */
export function DateOfBirthField({
  label = "Date of birth",
  defaultYear = 1990,
  ...p
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  defaultYear?: number;
}) {
  return (
    <DateField
      {...p}
      label={label}
      placeholder="Tap to open calendar"
      startOnYear
      showAge
      maxDate={new Date()}
      minDate={new Date(1900, 0, 1)}
      defaultDate={new Date(defaultYear, 0, 1)}
    />
  );
}

export const GENDER_OPTIONS = [
  { value: "MALE" as const, label: "Male", icon: "male" as const },
  { value: "FEMALE" as const, label: "Female", icon: "female" as const },
  { value: "OTHER" as const, label: "Other", icon: "male-female" as const },
];

// ── Searchable select ────────────────────────────────────────────────────────
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select",
  error,
  required,
  hint,
  icon,
  allowOther,
  searchPlaceholder = "Search",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { group?: string; value: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  icon?: IconName;
  /** Offer an "Other" row that lets the user type a value not in the list. */
  allowOther?: boolean;
  searchPlaceholder?: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [typing, setTyping] = useState(false);
  const [other, setOther] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return options.filter((o) => !needle || o.value.toLowerCase().includes(needle));
  }, [options, q]);

  const close = () => {
    setOpen(false);
    setQ("");
    setTyping(false);
  };
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  return (
    <FieldShell label={label} required={required} error={error} hint={hint}>
      <Pressable onPress={() => setOpen(true)} style={[s.inputBox, error && s.inputError]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.gray} /> : null}
        <Text style={[s.inputText, s.selectText, !value && { color: colors.placeholder }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.gray} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: colors.card, paddingTop: insets.top }}>
          <View style={s.modalHead}>
            <Pressable onPress={close} hitSlop={10} style={s.modalBack} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <Text style={s.modalTitle}>{label}</Text>
          </View>
          {typing ? (
            <View style={{ padding: space.lg, gap: space.md }}>
              <TextField label={`Type your ${label.toLowerCase()}`} value={other} onChangeText={setOther} autoFocus returnKeyType="done" onSubmitEditing={() => other.trim() && pick(other.trim())} />
              <Button title="Use this" onPress={() => other.trim() && pick(other.trim())} disabled={!other.trim()} />
              <Button title="Back to list" variant="ghost" onPress={() => setTyping(false)} />
            </View>
          ) : (
            <>
              <View style={{ padding: space.md }}>
                <View style={s.inputBox}>
                  <Ionicons name="search" size={18} color={colors.gray} />
                  <TextInput value={q} onChangeText={setQ} placeholder={searchPlaceholder} placeholderTextColor={colors.placeholder} style={s.inputText} autoCorrect={false} />
                  {q ? (
                    <Pressable onPress={() => setQ("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.gray} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <FlatList
                data={rows}
                keyExtractor={(o) => `${o.group ?? ""}:${o.value}`}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                renderItem={({ item, index }) => {
                  const showGroup = item.group && item.group !== rows[index - 1]?.group;
                  const on = item.value === value;
                  return (
                    <>
                      {showGroup ? <Text style={s.groupHead}>{item.group}</Text> : null}
                      <Pressable onPress={() => pick(item.value)} style={({ pressed }) => [s.option, pressed && { backgroundColor: colors.bg }]}>
                        <Text style={[s.optionText, on && { color: colors.primary, fontWeight: "800" }]}>{item.value}</Text>
                        {on ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                      </Pressable>
                    </>
                  );
                }}
                ListEmptyComponent={<Text style={[kit.hint, { textAlign: "center", padding: space.xl }]}>No match for “{q}”.</Text>}
                ListFooterComponent={
                  allowOther ? (
                    <Pressable onPress={() => { setOther(q.trim()); setTyping(true); }} style={[s.option, { borderBottomWidth: 0 }]}>
                      <Text style={[s.optionText, { color: colors.primary, fontWeight: "700" }]}>Other — type it</Text>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </Pressable>
                  ) : undefined
                }
              />
            </>
          )}
        </View>
      </Modal>
    </FieldShell>
  );
}

// ── Question card ────────────────────────────────────────────────────────────
/** One question per card: icon, title, short helper, then the control. */
export function QuestionCard({
  icon,
  tone = "primary",
  title,
  subtitle,
  optional,
  children,
}: {
  icon: IconName;
  tone?: "primary" | "green" | "red" | "amber" | "violet" | "blue";
  title: string;
  subtitle?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={s.qCard}>
      <View style={s.qHead}>
        <IconBox icon={icon} tone={tone} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.qTitle}>{title}</Text>
            {optional ? (
              <View style={s.optional}>
                <Text style={s.optionalText}>Optional</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? <Text style={s.qSub}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

// ── Consent checkbox card ────────────────────────────────────────────────────
export function CheckCard({ checked, onToggle, title, children, error }: { checked: boolean; onToggle: () => void; title: string; children?: React.ReactNode; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={onToggle} style={[s.check, checked && { borderColor: colors.primary, backgroundColor: colors.primarySoft }, error && !checked && s.inputError]}>
        <View style={[s.box, checked && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          {checked ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.checkTitle}>{title}</Text>
          {children}
        </View>
      </Pressable>
      {error && !checked ? (
        <View style={s.errRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={kit.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  errRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 11,
    paddingHorizontal: 13,
  },
  suffix: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  suggest: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  suggestOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  suggestText: { fontSize: 12.5, fontWeight: "600", color: colors.textMuted },
  inputError: { borderColor: colors.danger, backgroundColor: "#FFF8F9" },
  inputText: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 },
  selectText: { paddingVertical: 0 },
  prefix: { alignSelf: "stretch", justifyContent: "center", paddingHorizontal: 13, borderRightWidth: 1, borderRightColor: colors.inputBorder, backgroundColor: colors.graySoft, borderTopLeftRadius: 11, borderBottomLeftRadius: 11 },
  prefixText: { fontSize: 15, fontWeight: "700", color: colors.text },
  choice: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  choiceIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.graySoft, alignItems: "center", justifyContent: "center" },
  tick: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { fontSize: 14, fontWeight: "700", color: colors.text },
  gridCell: { height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  gridText: { fontSize: 15, fontWeight: "800", color: colors.text },
  backdrop: { flex: 1, backgroundColor: "rgba(15,27,51,0.45)", justifyContent: "center", padding: space.lg },
  sheet: { backgroundColor: colors.card, borderRadius: radius.xl, padding: space.lg },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  sheetSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  agePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.primarySoft },
  agePillText: { fontSize: 12.5, fontWeight: "800", color: colors.primary },
  modalHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalBack: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  groupHead: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, fontSize: 11.5, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optionText: { fontSize: 15.5, color: colors.text },
  qCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14, ...shadow },
  qHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  qTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  qSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  optional: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: colors.graySoft },
  optionalText: { fontSize: 10.5, fontWeight: "800", color: colors.textMuted },
  check: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.gray, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text, lineHeight: 20 },
});
