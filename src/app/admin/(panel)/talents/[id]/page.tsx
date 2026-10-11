import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/page-header";
import {
  RemoveUnavailabilityButton,
  TalentForm,
  UnavailabilityForm,
  WorkingHoursEditor,
} from "@/components/admin/talent-forms";
import { BookingStatusBadge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { getTalent } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Detail talent" };

export default async function TalentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user } = await requireAdmin();
  const data = await getTalent(id);
  if (!data) notFound();
  const { talent, hours, unavailability, appointments } = data;

  return (
    <>
      <AdminHeader
        title={talent.name}
        description={talent.is_active ? "Talent aktif" : "Talent nonaktif"}
        email={user.email ?? undefined}
        actions={<Link href="/admin/talents" className="text-sm font-medium text-muted hover:text-ink">← Kembali</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel title="Profil">
            <TalentForm talent={talent} />
          </Panel>
          <Panel title="Jam kerja mingguan" description="Waktu WIB. Hari yang tidak dicentang dianggap libur.">
            <WorkingHoursEditor talentId={id} hours={hours} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Cuti / tidak tersedia">
            {unavailability.length > 0 && (
              <ul className="mb-5 divide-y divide-line rounded-xl border border-line">
                {unavailability.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span>
                      <span className="block font-medium">
                        {formatDateTime(u.starts_at)} → {formatDateTime(u.ends_at)}
                      </span>
                      {u.reason && <span className="text-muted">{u.reason}</span>}
                    </span>
                    <RemoveUnavailabilityButton talentId={id} id={u.id} />
                  </li>
                ))}
              </ul>
            )}
            <UnavailabilityForm talentId={id} />
          </Panel>

          <Panel title="Jadwal appointment">
            {appointments.length === 0 ? (
              <p className="text-sm text-muted">Belum ada appointment terjadwal.</p>
            ) : (
              <ul className="divide-y divide-line">
                {appointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <Link href={`/admin/appointments/${a.id}`} className="font-mono text-xs font-bold hover:underline">
                        {a.booking_code}
                      </Link>
                      <span className="block text-muted">
                        {a.scheduled_start ? formatDateTime(a.scheduled_start) : "—"} · {a.customer_name}
                      </span>
                    </span>
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
