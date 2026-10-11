import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { BookingStatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth";
import { listAppointments } from "@/lib/data/admin";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { APPOINTMENT_LABEL, APPOINTMENT_STATUSES } from "@/lib/status";

export const metadata: Metadata = { title: "Appointment" };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const [{ user }, sp] = await Promise.all([requireAdmin(), searchParams]);
  const dateOk = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const rows = await listAppointments({ status: sp.status, from: dateOk(sp.from), to: dateOk(sp.to) });

  return (
    <>
      <AdminHeader
        title="Appointment"
        description="Seluruh booking COD. Filter tanggal memakai tanggal usulan pelanggan."
        email={user.email ?? undefined}
      />

      <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-muted">Status</label>
          <Select id="status" name="status" defaultValue={sp.status ?? "all"} className="sm:w-52">
            <option value="all">Semua status</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{APPOINTMENT_LABEL[s]}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-medium text-muted">Dari tanggal</label>
          <Input id="from" name="from" type="date" defaultValue={sp.from} />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-medium text-muted">Sampai tanggal</label>
          <Input id="to" name="to" type="date" defaultValue={sp.to} />
        </div>
        <Button type="submit" variant="dark">Terapkan</Button>
      </form>

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty="Tidak ada booking yang cocok dengan filter."
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
          {
            key: "pref",
            header: "Usulan",
            cell: (r) => `${formatDate(r.preferred_date)} · ${formatTime(r.preferred_time)}`,
          },
          {
            key: "final",
            header: "Jadwal final",
            cell: (r) =>
              r.scheduled_start ? (
                <span>
                  {formatDateTime(r.scheduled_start)}
                  <span className="block text-xs text-muted">{r.talents?.name}</span>
                </span>
              ) : (
                <span className="text-muted">—</span>
              ),
          },
          { key: "status", header: "Status", cell: (r) => <BookingStatusBadge status={r.status} /> },
        ]}
      />
    </>
  );
}
