import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Panel } from "@/components/admin/page-header";
import { UnitForm } from "@/components/admin/unit-form";
import { requireAdmin } from "@/lib/auth";
import { listModels } from "@/lib/data/admin";
import { createUnit } from "@/lib/actions/inventory";

export const metadata: Metadata = { title: "Tambah unit" };

export default async function NewUnitPage() {
  const { user } = await requireAdmin();
  const models = await listModels();
  return (
    <>
      <AdminHeader
        title="Tambah unit"
        description="Foto dapat diunggah setelah unit disimpan."
        email={user.email ?? undefined}
        actions={
          <Link href="/admin/inventory" className="text-sm font-medium text-muted hover:text-ink">
            ← Kembali
          </Link>
        }
      />
      <Panel>
        <UnitForm action={createUnit} models={models} submitLabel="Simpan unit" />
      </Panel>
    </>
  );
}
