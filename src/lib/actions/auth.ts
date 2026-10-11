"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/admin-gate";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation/admin";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid."),
  password: z.string().min(1, "Password wajib diisi.").max(200),
});

const INVALID = "Email atau password salah, atau akun ini bukan admin.";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase belum dikonfigurasi. Lihat README untuk langkah setup." };
  }
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Pembatasan percobaan login (best effort — butuh secret key terpasang).
  if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const ok = await rateLimit("login-ip", await clientIp(), 10, 10 * 60);
    if (!ok) return { ok: false, message: "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, message: INVALID };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { ok: false, message: INVALID };
  }

  redirect(safeNextPath(String(formData.get("next") ?? "")));
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
