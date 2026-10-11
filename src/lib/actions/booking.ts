"use server";

import { redirect } from "next/navigation";
import { bookingFormSchema, checkBookingSchema } from "@/lib/validation/booking";
import { normalizePhone } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { dbErrorMessage } from "@/lib/status";
import { formDataToObject } from "@/lib/validation/admin";
import type { BookingLookup } from "@/types/db";

export type BookingState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const TOO_MANY = "Terlalu banyak percobaan. Mohon tunggu beberapa menit lalu coba lagi.";
const GENERIC = "Maaf, terjadi kesalahan pada server. Silakan coba lagi sebentar lagi.";

export async function submitBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Layanan booking belum aktif. Silakan hubungi kami lewat WhatsApp." };
  }

  const parsed = bookingFormSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Periksa kembali isian formulir.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  // Honeypot terisi: pura-pura sukses tanpa menyimpan apa pun.
  if (parsed.data.website) {
    return { ok: false, message: GENERIC };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return { ok: false, fieldErrors: { phone: ["Nomor WhatsApp tidak valid."] } };
  }

  const ip = await clientIp();
  const [ipOk, phoneOk] = await Promise.all([
    rateLimit("booking-ip", ip, 6, 10 * 60),
    rateLimit("booking-phone", phone, 3, 60 * 60),
  ]);
  if (!ipOk || !phoneOk) return { ok: false, message: TOO_MANY };

  let code: string;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("create_booking", {
      p_unit_id: parsed.data.unitId,
      p_name: parsed.data.name,
      p_phone: phone,
      p_date: parsed.data.date,
      p_time: parsed.data.time,
      p_area: parsed.data.area,
      p_notes: parsed.data.notes || null,
    });
    if (error) {
      return { ok: false, message: dbErrorMessage(error.message, GENERIC) };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.booking_code) return { ok: false, message: GENERIC };
    code = row.booking_code as string;
  } catch {
    return { ok: false, message: GENERIC };
  }

  redirect(`/booking/sukses?kode=${encodeURIComponent(code)}`);
}

export type CheckBookingState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  booking?: BookingLookup;
};

export async function checkBooking(_prev: CheckBookingState, formData: FormData): Promise<CheckBookingState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Layanan cek booking belum aktif." };
  }
  const parsed = checkBookingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const phone = normalizePhone(parsed.data.phone)!;

  const ip = await clientIp();
  const [ipOk, codeOk] = await Promise.all([
    rateLimit("lookup-ip", ip, 10, 10 * 60),
    rateLimit("lookup-code", parsed.data.code, 8, 60 * 60),
  ]);
  if (!ipOk || !codeOk) return { ok: false, message: TOO_MANY };

  try {
    const supabase = createServiceClient();
    await supabase.rpc("release_expired_holds");
    const { data, error } = await supabase.rpc("lookup_booking", {
      p_code: parsed.data.code,
      p_phone: phone,
    });
    if (error) return { ok: false, message: GENERIC };
    const row = (data as BookingLookup[] | null)?.[0];
    // Pesan sama untuk kode salah maupun nomor salah — mencegah enumerasi.
    if (!row) return { ok: false, message: "Booking tidak ditemukan. Periksa kode dan nomor WhatsApp Anda." };
    return { ok: true, booking: row };
  } catch {
    return { ok: false, message: GENERIC };
  }
}
