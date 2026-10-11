"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/status";
import { jakartaToIso } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import {
  formDataToObject,
  settingsSchema,
  talentSchema,
  unavailabilitySchema,
  type ActionState,
} from "@/lib/validation/admin";

function talentRow(d: z.infer<typeof talentSchema>) {
  return {
    name: d.name,
    phone_whatsapp: d.phone ? normalizePhone(d.phone) : null,
    service_areas: d.serviceAreas
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20),
    notes: d.notes ?? null,
    is_active: d.isActive,
  };
}

export async function createTalent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = talentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { data, error } = await supabase.from("talents").insert(talentRow(parsed.data)).select("id").single();
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/admin/talents");
  redirect(`/admin/talents/${data.id}`);
}

export async function updateTalent(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = talentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { error } = await supabase.from("talents").update(talentRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/admin/talents");
  revalidatePath(`/admin/talents/${id}`);
  return { ok: true, message: "Data talent disimpan." };
}

const hoursSchema = z.array(
  z
    .object({
      weekday: z.number().int().min(0).max(6),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .refine((h) => h.end > h.start, "Jam selesai harus setelah jam mulai."),
);

/** Mengganti seluruh jam kerja mingguan talent. */
export async function saveWorkingHours(
  talentId: string,
  hours: { weekday: number; start: string; end: string }[],
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = hoursSchema.safeParse(hours);
  if (!parsed.success) return { ok: false, message: "Jam kerja tidak valid (jam selesai harus setelah jam mulai)." };

  const del = await supabase.from("talent_working_hours").delete().eq("talent_id", talentId);
  if (del.error) return { ok: false, message: dbErrorMessage(del.error.message) };
  if (parsed.data.length) {
    const ins = await supabase.from("talent_working_hours").insert(
      parsed.data.map((h) => ({ talent_id: talentId, weekday: h.weekday, start_time: h.start, end_time: h.end })),
    );
    if (ins.error) return { ok: false, message: dbErrorMessage(ins.error.message) };
  }
  revalidatePath(`/admin/talents/${talentId}`);
  return { ok: true, message: "Jam kerja disimpan." };
}

export async function addUnavailability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = unavailabilitySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const { error } = await supabase.from("talent_unavailability").insert({
    talent_id: d.talentId,
    starts_at: jakartaToIso(d.startDate, d.startTime),
    ends_at: jakartaToIso(d.endDate, d.endTime),
    reason: d.reason ?? null,
  });
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath(`/admin/talents/${d.talentId}`);
  return { ok: true, message: "Waktu tidak tersedia dicatat." };
}

export async function removeUnavailability(talentId: string, id: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("talent_unavailability").delete().eq("id", id).eq("talent_id", talentId);
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath(`/admin/talents/${talentId}`);
  return { ok: true, message: "Dihapus." };
}

const SETTING_KEYS = [
  "store_name",
  "instagram_handle",
  "whatsapp_number",
  "address",
  "operating_hours",
  "service_info",
  "booking_policy",
  "hold_hours",
  "appointment_minutes",
] as const;
const PRIVATE_KEYS = new Set(["hold_hours", "appointment_minutes"]);

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const wa = d.whatsapp_number ? normalizePhone(d.whatsapp_number) ?? "" : "";
  const values: Record<(typeof SETTING_KEYS)[number], string> = {
    store_name: d.store_name,
    instagram_handle: d.instagram_handle,
    whatsapp_number: wa,
    address: d.address,
    operating_hours: d.operating_hours,
    service_info: d.service_info,
    booking_policy: d.booking_policy,
    hold_hours: String(d.hold_hours),
    appointment_minutes: String(d.appointment_minutes),
  };
  const rows = SETTING_KEYS.map((key) => ({ key, value: values[key], is_public: !PRIVATE_KEYS.has(key) }));
  const { error } = await supabase.from("store_settings").upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan disimpan." };
}
