import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { addDays, todayJakarta } from "@/lib/format";

export const MAX_BOOKING_DAYS_AHEAD = 60;

export const bookingFormSchema = z.object({
  unitId: z.string().uuid("Unit tidak valid."),
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(80, "Nama maksimal 80 karakter."),
  phone: z
    .string()
    .trim()
    .min(1, "Nomor WhatsApp wajib diisi.")
    .refine((v) => normalizePhone(v) !== null, "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi.")
    .refine((v) => v >= todayJakarta(), "Tanggal tidak boleh di masa lalu.")
    .refine(
      (v) => v <= addDays(todayJakarta(), MAX_BOOKING_DAYS_AHEAD),
      `Tanggal maksimal ${MAX_BOOKING_DAYS_AHEAD} hari ke depan.`,
    ),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Waktu wajib diisi."),
  area: z
    .string()
    .trim()
    .min(3, "Area/lokasi usulan minimal 3 karakter.")
    .max(200, "Area/lokasi usulan maksimal 200 karakter."),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().or(z.literal("")),
  /** Honeypot: harus kosong. Bot biasanya mengisinya. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type BookingFormInput = z.infer<typeof bookingFormSchema>;

export const checkBookingSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^KRB-[0-9A-F]{10}$/, "Format kode booking tidak valid. Contoh: KRB-1A2B3C4D5E."),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizePhone(v) !== null, "Nomor WhatsApp tidak valid."),
});
