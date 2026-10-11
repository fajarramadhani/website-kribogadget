import { redirect } from "next/navigation";
import { Logo } from "@/components/public/logo";
import { LoginForm } from "./login-form";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/admin-gate";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const configured = isSupabaseConfigured();

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (profile?.role === "admin") redirect(safeNextPath(sp.next));
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo tone="light" />
          <p className="mt-2 text-sm text-white/60">Masuk ke dashboard admin</p>
        </div>
        <div className="rounded-card bg-paper p-6 shadow-xl">
          {!configured && (
            <p role="alert" className="mb-4 rounded-xl bg-accent-soft p-3 text-sm">
              Supabase belum dikonfigurasi. Isi <code>.env.local</code> sesuai README, lalu jalankan ulang aplikasi.
            </p>
          )}
          {sp.error === "forbidden" && (
            <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              Akun ini tidak memiliki akses admin.
            </p>
          )}
          <LoginForm next={sp.next} disabled={!configured} />
        </div>
      </div>
    </div>
  );
}
