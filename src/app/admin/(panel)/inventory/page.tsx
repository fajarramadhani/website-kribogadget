import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Smartphone } from "lucide-react";
import { AdminHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { StockBadge, DemoBadge } from "@/components/ui/badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth";
import { listInventory } from "@/lib/data/admin";
import { primaryImage } from "@/lib/data/public";
import { formatRupiah, formatStorage } from "@/lib/format";

export const metadata: Metadata = { title: "Inventori" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; arsip?: string }>;
}) {
  const [{ user }, sp] = await Promise.all([requireAdmin(), searchParams]);
  const archived = sp.arsip === "1";
  const units = await listInventory({ q: sp.q, status: sp.status, archived });

  return (
    <>
      <AdminHeader
        title="Inventori"
        description={archived ? "Unit yang diarsipkan (riwayat tetap tersimpan)." : "Kelola unit, harga, status stok, dan foto."}
        email={user.email ?? undefined}
        actions={
          <Link href="/admin/inventory/new" className={buttonVariants({ size: "sm" })}>
            + Tambah unit
          </Link>
        }
      />

      <form method="GET" className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="q">Cari</label>
        <Input id="q" name="q" defaultValue={sp.q} placeholder="Cari kode, model, atau warna" className="sm:max-w-xs" />
        <label className="sr-only" htmlFor="status">Status stok</label>
        <Select id="status" name="status" defaultValue={sp.status ?? ""} className="sm:w-48">
          <option value="">Semua status</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
        </Select>
        <Select name="arsip" defaultValue={archived ? "1" : ""} aria-label="Arsip" className="sm:w-44">
          <option value="">Aktif</option>
          <option value="1">Diarsipkan</option>
        </Select>
        <Button type="submit" variant="dark">Terapkan</Button>
      </form>

      <DataTable
        rows={units}
        rowKey={(u) => u.id}
        empty={archived ? "Tidak ada unit yang diarsipkan." : "Belum ada unit. Tambahkan unit pertama Anda."}
        columns={[
          {
            key: "unit",
            header: "Unit",
            cell: (u) => {
              const img = primaryImage(u.unit_images);
              return (
                <Link href={`/admin/inventory/${u.id}`} className="flex items-center gap-3 hover:underline">
                  <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-canvas">
                    {img ? (
                      <Image src={img.url} alt="" fill sizes="48px" unoptimized={img.url.endsWith(".svg")} className="object-cover" />
                    ) : (
                      <Smartphone className="size-5 text-muted" aria-hidden />
                    )}
                  </span>
                  <span>
                    <span className="block font-semibold">{u.product_models?.name}</span>
                    <span className="block text-xs text-muted">
                      {u.unit_code} · {formatStorage(u.storage_gb)} · {u.color}
                    </span>
                  </span>
                </Link>
              );
            },
          },
          { key: "price", header: "Harga", cell: (u) => <span className="font-semibold">{formatRupiah(u.price)}</span> },
          { key: "battery", header: "Battery", cell: (u) => (u.battery_health != null ? `${u.battery_health}%` : "—") },
          {
            key: "stock",
            header: "Stok",
            cell: (u) => (
              <span className="flex flex-wrap gap-1.5">
                <StockBadge status={u.stock_status} />
                {u.is_demo && <DemoBadge />}
              </span>
            ),
          },
          {
            key: "pub",
            header: "Publikasi",
            cell: (u) => (u.archived_at ? "Diarsipkan" : u.is_published ? "Terbit" : "Draft"),
          },
        ]}
      />
    </>
  );
}
