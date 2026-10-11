/** Enum status — harus identik dengan tipe enum di supabase/migrations/0001_schema.sql */
export const STOCK_STATUSES = ["available", "reserved", "sold"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "reschedule_requested",
  "completed",
  "cancelled",
  "no_show",
  "expired",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STOCK_LABEL: Record<StockStatus, string> = {
  available: "Tersedia",
  reserved: "Sedang Dibooking",
  sold: "Terjual",
};

export const APPOINTMENT_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  reschedule_requested: "Reschedule Requested",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  expired: "Expired",
};

/** Cermin aturan transisi di fungsi admin_set_appointment_status. */
export const STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ["cancelled"],
  confirmed: ["reschedule_requested", "completed", "cancelled", "no_show"],
  reschedule_requested: ["cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
  expired: [],
};

/** Status yang boleh dijadwalkan/dikonfirmasi lewat admin_schedule_appointment. */
export const SCHEDULABLE: readonly AppointmentStatus[] = ["pending", "reschedule_requested", "confirmed"];

export const ACTIVE_STATUSES: readonly AppointmentStatus[] = ["pending", "confirmed", "reschedule_requested"];

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Kode error dari database -> pesan Bahasa Indonesia untuk pengguna. */
export const DB_ERROR_MESSAGES: Record<string, string> = {
  UNIT_NOT_FOUND: "Unit tidak ditemukan atau sudah tidak dipublikasikan.",
  UNIT_UNAVAILABLE: "Maaf, unit ini sedang dibooking atau sudah terjual. Silakan pilih unit lain.",
  FORBIDDEN: "Anda tidak memiliki akses untuk tindakan ini.",
  INVALID_TRANSITION: "Perubahan status ini tidak diizinkan dari status saat ini.",
  APPOINTMENT_NOT_FOUND: "Booking tidak ditemukan.",
  TALENT_NOT_FOUND: "Talent tidak ditemukan.",
  TALENT_INACTIVE: "Talent ini sedang nonaktif.",
  OUTSIDE_WORKING_HOURS: "Waktu tersebut di luar jam kerja talent.",
  TALENT_UNAVAILABLE: "Talent sedang cuti/tidak tersedia pada waktu tersebut.",
  TALENT_CONFLICT: "Talent sudah punya appointment lain yang bentrok pada waktu tersebut.",
  INVALID_TIME_RANGE: "Waktu selesai harus setelah waktu mulai.",
  LOCATION_REQUIRED: "Lokasi COD final wajib diisi.",
  ALREADY_SOLD: "Unit ini sudah memiliki penjualan final.",
  SALE_REQUIRED: "Status Terjual hanya dapat diatur dengan mencatat penjualan.",
  UNIT_ALREADY_SOLD: "Unit sudah terjual dan statusnya tidak dapat diubah.",
  UNIT_HAS_ACTIVE_BOOKING: "Unit masih memiliki booking aktif, batalkan booking terlebih dahulu.",
  INVALID_PRICE: "Harga tidak valid.",
};

export function dbErrorMessage(
  message: string | undefined | null,
  fallback = "Terjadi kesalahan. Silakan coba lagi.",
): string {
  if (!message) return fallback;
  for (const code of Object.keys(DB_ERROR_MESSAGES)) {
    if (message.includes(code)) return DB_ERROR_MESSAGES[code];
  }
  if (/duplicate key|unique/i.test(message)) {
    if (/unit_code/.test(message)) return "Kode unit sudah dipakai.";
    if (/slug/.test(message)) return "Slug sudah dipakai.";
    return "Data duplikat.";
  }
  return fallback;
}
