import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Panel } from "@/components/admin/page-header";
import { TalentForm } from "@/components/admin/talent-forms";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Tambah talent" };

export default async function NewTalentPage() {
  const { user } = await requireAdmin();
  return (
    <>
      <AdminHeader
        title="Tambah talent"
        description="Jam kerja dapat diatur setelah talent disimpan."
        email={user.email ?? undefined}
        actions={<Link href="/admin/talents" className="text-sm font-medium text-muted hover:text-ink">← Kembali</Link>}
      />
      <Panel>
        <TalentForm />
      </Panel>
    </>
  );
}
