import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireAdmin();
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="bg-canvas">
      <AdminSidebar pending={count ?? 0}>
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </AdminSidebar>
    </div>
  );
}
