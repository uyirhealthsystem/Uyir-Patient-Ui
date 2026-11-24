import type { Tone } from "../ui/components";

export function money(v: number | string | null | undefined, currency = "INR") {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return `${currency === "INR" ? "₹" : currency + " "}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function dateOnly(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** YYYY-MM-DD in local time. */
export function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());
}

/** Next `n` days starting today, for date pickers. */
export function nextDays(n: number, from = 0) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i + from);
    return d;
  });
}

export function dayLabel(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Combine a local date and "HH:MM" into an ISO instant. */
export function atTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

export function statusTone(status: string): Tone {
  switch (status) {
    case "CONFIRMED":
    case "ACCEPTED":
    case "COMPLETED":
    case "PAID":
    case "PICKED_UP":
      return "green";
    case "CANCELLED":
    case "REJECTED":
    case "FAILED":
    case "NO_SHOW":
    case "NO_AMBULANCE_FOUND":
      return "red";
    case "PENDING":
    case "REQUESTED":
    case "SEARCHING":
    case "PAYMENT_PENDING":
    case "SCHEDULED":
    case "RESCHEDULED":
      return "amber";
    case "EN_ROUTE_TO_PICKUP":
    case "ARRIVED":
    case "IN_PROGRESS":
      return "blue";
    default:
      return "gray";
  }
}

export function hospitalAddress(a?: { addressLine?: string; city?: string; district?: string; pincode?: string }) {
  if (!a) return "";
  return [a.addressLine, a.city, a.pincode].filter(Boolean).join(", ");
}

/** Phone numbers in the form the backends accept: digits with optional leading +. */
export function cleanPhone(p: string) {
  const t = p.trim().replace(/[\s-]/g, "");
  return t;
}
