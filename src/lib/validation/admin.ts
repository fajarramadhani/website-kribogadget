import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

/** Kosong -> undefined, supaya optional() bekerja pada input FormData. */
const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const optionalText = (max: number, label: string) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max, `${label} maksimal ${max} karakter.`).optional());

export const unitSchema = z.object({
  unitCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$/, "Kode unit 2-40 karakter: huruf, angka, titik, strip."),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan strip.")
    .max(80),
  modelName: z.string().trim().min(2, "Model wajib diisi.").max(80),
  storageGb: z.coerce.number().int("Storage harus bilangan bulat.").min(1).max(4096),
  color: z.string().trim().min(1, "Warna wajib diisi.").max(40),
  batteryHealth: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(0, "Battery health 0-100.").max(100, "Battery health 0-100.").optional(),
  ),
  conditionGrade: optionalText(40, "Kondisi fisik"),
  conditionNotes: optionalText(1000, "Catatan minus"),
  completeness: optionalText(500, "Kelengkapan"),
  warrantyInfo: optionalText(500, "Garansi"),
  price: z.coerce.number().min(0, "Harga tidak boleh negatif.").max(999_999_999),
  stockStatus: z.enum(["available", "reserved"]),
  isPublished: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});
export type UnitInput = z.infer<typeof unitSchema>;

export const talentSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  phone: z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .refine((v) => normalizePhone(v) !== null, "Nomor WhatsApp tidak valid.")
      .optional(),
  ),
  serviceAreas: z.string().trim().max(500).default(""),
  notes: optionalText(500, "Catatan"),
  isActive: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const unavailabilitySchema = z
  .object({
    talentId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai wajib."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Jam mulai wajib."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal selesai wajib."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Jam selesai wajib."),
    reason: optionalText(200, "Alasan"),
  })
  .refine((v) => `${v.endDate}T${v.endTime}` > `${v.startDate}T${v.startTime}`, {
    message: "Waktu selesai harus setelah waktu mulai.",
    path: ["endTime"],
  });

export const scheduleSchema = z
  .object({
    appointmentId: z.string().uuid(),
    talentId: z.string().uuid("Pilih talent."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Jam mulai wajib diisi."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Jam selesai wajib diisi."),
    location: z.string().trim().min(2, "Lokasi COD final wajib diisi.").max(300),
    note: optionalText(1000, "Catatan"),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "Jam selesai harus setelah jam mulai.",
    path: ["endTime"],
  });

export const statusChangeSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(["reschedule_requested", "completed", "cancelled", "no_show"]),
  note: optionalText(1000, "Catatan"),
  outcome: optionalText(1000, "Hasil pertemuan"),
});

export const saleSchema = z.object({
  unitId: z.string().uuid(),
  appointmentId: z.preprocess(emptyToUndef, z.string().uuid().optional()),
  price: z.coerce.number().min(0, "Harga tidak boleh negatif.").max(999_999_999),
  notes: optionalText(500, "Catatan"),
});

export const settingsSchema = z.object({
  store_name: z.string().trim().min(2, "Nama toko wajib diisi.").max(80),
  instagram_handle: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), "Username Instagram tidak valid."),
  whatsapp_number: z
    .string()
    .trim()
    .refine((v) => v === "" || normalizePhone(v) !== null, "Nomor WhatsApp tidak valid."),
  address: z.string().trim().max(300),
  operating_hours: z.string().trim().max(300),
  service_info: z.string().trim().max(1000),
  booking_policy: z.string().trim().max(1000),
  hold_hours: z.coerce.number().int().min(1, "Minimal 1 jam.").max(720),
  appointment_minutes: z.coerce.number().int().min(15, "Minimal 15 menit.").max(480),
});

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function formDataToObject(fd: FormData): Record<string, FormDataEntryValue> {
  const out: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}
