import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client dengan secret key (melewati RLS). HANYA untuk operasi server yang sudah divalidasi:
 * create_booking, lookup_booking, check_rate_limit. Jangan impor dari Client Component.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) {
    throw new Error("SUPABASE_SECRET_KEY belum dikonfigurasi");
  }
  return createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
