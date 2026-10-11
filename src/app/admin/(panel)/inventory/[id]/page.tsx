import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/page-header";
import { UnitForm } from "@/components/admin/unit-form";
import { ImageManager } from "@/components/admin/image-manager";
import { UnitStateActions } from "@/components/admin/unit-state-actions";
import { RecordSaleForm } from "@/components/admin/record-sale-form";
import { StockBadge, BookingStatusBadge, DemoBadge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { getUnitById, getUnitHistory, listModels } from "@/lib/data/admin";
import { unitDisplayName } from "@/lib/data/public";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { updateUnit } from "@/lib/actions/inventory";

export const metadata: Metadata = { title: "Edit unit" };

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user } = await requireAdmin();
  const unit = await getUnitById(id);
  if (!unit) notFound();
  const [models, history] = await Promise.all([listModels(), getUnitHistory(id)]);
  const name = unitDisplayName(unit);
  const activeAppt = history.appointments.find((a) => ["pending", "confirmed", "reschedule_requested"].includes(a.status));

  return (
    <>
      <AdminHeader
        title={name}
        description={`Kode ${unit.unit_code}`}
        email={user.email ?? undefined}
        actions={
          <Link href="/admin/inventory" className="text-sm font-medium text-muted hover:text-ink">
            ← Kembali
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StockBadge status={unit.stock_status} />
        {unit.is_demo && <DemoBadge />}
        <span className="text-sm text-muted">
          {unit.archived_at ? "Diarsipkan" : unit.is_published ? "Terbit di katalog" : "Draft (tidak tampil)"}
        </span>
        {unit.is_published && !unit.archived_at && (
          <Link href={`/katalog/${unit.slug}`} target="_blank" className="text-sm font-semibold text-accent-dark hover:underline">
            Lihat di katalog ↗
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Data unit">
            <UnitForm action={updateUnit.bind(null, id)} unit={unit} models={models} submitLabel="Simpan perubahan" />
          </Panel>
          <Panel title="Foto" description="Foto utama tampil di kartu katalog.">
            <ImageManager unitId={id} images={unit.unit_images} unitName={name} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <UnitStateActions
              unitId={id}
              published={unit.is_published}
              archived={Boolean(unit.archived_at)}
              sold={unit.stock_status === "sold"}
            />
          </Panel>

          {history.sale ? (
            <Panel title="Penjualan final">
              <p className="text-2xl font-extrabold">{formatRupiah(history.sale.sale_price)}</p>
              <p className="mt-1 text-sm text-muted">Tercatat {formatDateTime(history.sale.sold_at)}</p>
            </Panel>
          ) : (
            <Panel title="Catat penjualan" description="Menandai unit sebagai Sold. Tidak dapat dibatalkan.">
              <RecordSaleForm
                unitId={id}
                appointmentId={activeAppt?.id}
                defaultPrice={Number(unit.price)}
              />
            </Panel>
          )}

          <Panel title="Riwayat booking">
            {history.appointments.length === 0 ? (
              <p className="text-sm text-muted">Belum ada booking untuk unit ini.</p>
            ) : (
              <ul className="space-y-3">
                {history.appointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/admin/appointments/${a.id}`} className="font-mono text-xs font-bold hover:underline">
                      {a.booking_code}
                    </Link>
                    <BookingStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
