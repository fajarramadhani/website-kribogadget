export const TIMEZONE = "Asia/Jakarta";
const OFFSET = "+07:00"; // Asia/Jakarta tidak memakai DST

export function formatRupiah(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatStorage(gb: number): string {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
}

export function formatDateTime(iso: string | Date): string {
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: TIMEZONE,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso)) + " WIB"
  );
}

export function formatDate(iso: string | Date): string {
  const d =
    typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? new Date(`${iso}T00:00:00${OFFSET}`)
      : new Date(iso);
  return new Intl.DateTimeFormat("id-ID", { timeZone: TIMEZONE, dateStyle: "full" }).format(d);
}

export function formatTime(t: string): string {
  return t.slice(0, 5) + " WIB";
}

/** "YYYY-MM-DD" + "HH:mm" (waktu Jakarta) -> ISO UTC. */
export function jakartaToIso(date: string, time: string): string {
  const d = new Date(`${date}T${time.length === 5 ? time + ":00" : time}${OFFSET}`);
  if (Number.isNaN(d.getTime())) throw new Error("Tanggal/waktu tidak valid");
  return d.toISOString();
}

/** Tanggal hari ini (YYYY-MM-DD) di Jakarta. */
export function todayJakarta(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
}

/** Batas awal/akhir hari Jakarta sebagai ISO UTC. */
export function dayBoundsJakarta(date: string): { start: string; end: string } {
  return { start: jakartaToIso(date, "00:00"), end: jakartaToIso(addDays(date, 1), "00:00") };
}

/** ISO UTC -> { date: YYYY-MM-DD, time: HH:mm } di Jakarta (untuk input form). */
export function toJakartaParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

export const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
