import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CalendarCheck2, CalendarDays, CheckCircle2, Package, PackageCheck, Wallet } from "lucide-react";
import { AdminHeader, Panel } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { BookingStatusBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/data/admin";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Ringkasan" };

export default async function AdminOverviewPage() {
  const { user } = await requireAdmin();
  const s = await getDashboardStats();

  const cards = [
    { label: "Unit Available", value: s.available, icon: Package, href: "/admin/inventory?status=available" },
    { label: "Unit Reserved", value: s.reserved, icon: PackageCheck, href: "/admin/inventory?status=reserved" },
    { label: "Booking Pending", value: s.pending, icon: AlertCircle, href: "/admin/appointments?status=pending", highlight: s.pending > 0 },
    { label: "Appointment hari ini", value: s.today, icon: CalendarDays, href: "/admin/appointments?status=confirmed" },
    { label: "Appointment Confirmed", value: s.confirmed, icon: CalendarCheck2, href: "/admin/appointments?status=confirmed" },
    { label: "Penjualan tercatat", value: s.salesCount, icon: CheckCircle2, href: "/admin/inventory?status=sold", sub: s.revenue ? formatRupiah(s.revenue) : undefined },
  ];

  return (
    <>
      <AdminHeader
        title="Ringkasan"
        description="Angka diambil langsung dari database."
        email={user.email ?? undefined}
        actions={
          <Link href="/admin/inventory/new" className={buttonVariants({ size: "sm" })}>
            + Tambah unit
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, href, highlight, sub }) => (
          <Link
            key={label}
            href={href}
            className={`group rounded-card border bg-paper p-5 shadow-card transition-shadow hover:shadow-lg ${
              highlight ? "border-accent" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">{label}</span>
              <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-dark">
                <Icon className="size-[18px]" aria-hidden />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
            {sub && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                <Wallet className="size-3.5" aria-hidden /> {sub}
              </p>
            )}
          </Link>
        ))}
      </div>

      <Panel title="Booking terbaru">
        <DataTable
          rows={s.recent}
          rowKey={(r) => r.id}
          empty="Belum ada booking."
          columns={[
            {
              key: "code",
              header: "Kode",
              cell: (r) => (
                <Link href={`/admin/appointments/${r.id}`} className="font-mono text-xs font-bold hover:underline">
                  {r.booking_code}
                </Link>
              ),
            },
            { key: "name", header: "Pelanggan", cell: (r) => r.customer_name },
            {
              key: "unit",
              header: "Unit",
              cell: (r) => `${r.units?.product_models?.name ?? ""} ${r.units?.storage_gb ?? ""}GB ${r.units?.color ?? ""}`,
            },
            { key: "status", header: "Status", cell: (r) => <BookingStatusBadge status={r.status} /> },
            { key: "created", header: "Dibuat", cell: (r) => formatDateTime(r.created_at) },
          ]}
        />
        <div className="mt-4">
          <Link href="/admin/appointments" className="text-sm font-semibold text-accent-dark hover:underline">
            Lihat semua appointment →
          </Link>
        </div>
      </Panel>
    </>
  );
}
