import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { listTalents } from "@/lib/data/admin";
import { formatPhoneDisplay } from "@/lib/phone";

export const metadata: Metadata = { title: "Talent" };

export default async function TalentsPage() {
  const { user } = await requireAdmin();
  const talents = await listTalents();
  return (
    <>
      <AdminHeader
        title="Talent"
        description="Seller/talent yang dapat ditugaskan admin pada appointment."
        email={user.email ?? undefined}
        actions={
          <Link href="/admin/talents/new" className={buttonVariants({ size: "sm" })}>
            + Tambah talent
          </Link>
        }
      />
      <DataTable
        rows={talents}
        rowKey={(t) => t.id}
        empty="Belum ada talent. Tambahkan talent pertama."
        columns={[
          {
            key: "name",
            header: "Nama",
            cell: (t) => (
              <Link href={`/admin/talents/${t.id}`} className="font-semibold hover:underline">
                {t.name}
                {t.is_demo && <span className="ml-2 text-[10px] font-bold uppercase text-muted">demo</span>}
              </Link>
            ),
          },
          { key: "wa", header: "WhatsApp", cell: (t) => (t.phone_whatsapp ? formatPhoneDisplay(t.phone_whatsapp) : "—") },
          { key: "areas", header: "Area", cell: (t) => (t.service_areas.length ? t.service_areas.join(", ") : "—") },
          {
            key: "active",
            header: "Status",
            cell: (t) => (
              <span className={t.is_active ? "font-semibold text-success" : "text-muted"}>
                {t.is_active ? "Aktif" : "Nonaktif"}
              </span>
            ),
          },
        ]}
      />
    </>
  );
}
