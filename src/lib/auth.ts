import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Pagar otorisasi admin di server. Memverifikasi token ke Supabase Auth (getUser) lalu
 * memastikan ada baris profiles dengan role admin. Dipanggil di layout, page, dan setiap server action admin.
 */
export const requireAdmin = cache(async () => {
  if (!isSupabaseConfigured()) redirect("/admin/login");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }
  return { supabase, user: data.user, profile };
});
