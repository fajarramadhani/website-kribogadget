"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/status";
import { jakartaToIso } from "@/lib/format";
import {
  formDataToObject,
  scheduleSchema,
  statusChangeSchema,
  type ActionState,
} from "@/lib/validation/admin";

export async function scheduleAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = scheduleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const { error } = await supabase.rpc("admin_schedule_appointment", {
    p_appointment_id: d.appointmentId,
    p_talent_id: d.talentId,
    p_start: jakartaToIso(d.date, d.startTime),
    p_end: jakartaToIso(d.date, d.endTime),
    p_location: d.location,
    p_note: d.note ?? null,
  });
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Booking dikonfirmasi dengan jadwal tersebut." };
}

export async function changeAppointmentStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = statusChangeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { error } = await supabase.rpc("admin_set_appointment_status", {
    p_appointment_id: parsed.data.appointmentId,
    p_new_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
    p_outcome: parsed.data.outcome ?? null,
  });
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Status diperbarui." };
}

const notesSchema = z.object({
  appointmentId: z.string().uuid(),
  notes: z.string().trim().max(1000, "Catatan maksimal 1000 karakter."),
});

export async function saveAdminNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = notesSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { error } = await supabase.rpc("admin_set_appointment_notes", {
    p_appointment_id: parsed.data.appointmentId,
    p_notes: parsed.data.notes,
  });
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath(`/admin/appointments/${parsed.data.appointmentId}`);
  return { ok: true, message: "Catatan internal disimpan." };
}
